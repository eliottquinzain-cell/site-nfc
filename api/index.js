const { 
    signJwt, 
    verifyJwt, 
    parseCookies, 
    createSessionCookie, 
    createClearSessionCookie, 
    verifyPassword, 
    COOKIE_NAME 
} = require('./lib/auth');

const db = require('./db');

// Cross-Origin Resource Sharing Headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
};

/**
 * Extract authenticated user session from Cookie or Bearer header
 */
function getSessionUser(req) {
    const cookies = parseCookies(req.headers.cookie);
    let token = cookies[COOKIE_NAME];

    if (!token && req.headers.authorization) {
        token = req.headers.authorization.replace(/^Bearer\s+/i, '').trim();
    }

    if (!token && req.body && req.body.adminToken) {
        token = req.body.adminToken;
    }

    if (!token) return null;
    return verifyJwt(token);
}

module.exports = async (req, res) => {
    // 1. CORS Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, CORS_HEADERS);
        return res.end();
    }

    // Set CORS headers on all responses
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
        res.setHeader(k, v);
    }

    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    let body = {};

    if (req.body) {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    }

    const action = body.action;

    try {
        // ==========================================
        // ROUTE: GET/POST /api/health or action='health'
        // ==========================================
        if (pathname === '/api/health' || action === 'health') {
            const health = await db.getHealthStatus();
            return res.status(200).json({ success: true, ...health });
        }

        // ==========================================
        // ROUTE: POST /api/auth/login or action='admin-login' / 'client-login'
        // ==========================================
        if (pathname === '/api/auth/login' || action === 'admin-login' || action === 'client-login' || (pathname === '/api' && action === 'login')) {
            const identifier = (body.usernameOrEmail || body.username || body.email || '').trim();
            const password = (body.password || body.motDePasse || '').trim();

            if (!identifier || !password) {
                return res.status(400).json({ success: false, error: 'Identifiant et mot de passe obligatoires.' });
            }

            const user = await db.findUserByUsernameOrEmail(identifier);
            if (!user) {
                return res.status(401).json({ success: false, error: 'Identifiant ou mot de passe incorrect.' });
            }

            const isValid = await verifyPassword(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ success: false, error: 'Identifiant ou mot de passe incorrect.' });
            }

            // Create JWT Session
            const hasSub = Boolean(user.has_subscription);
            const sessionPayload = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: user.name,
                badge: user.badge,
                hasSubscription: hasSub
            };

            const token = signJwt(sessionPayload);
            res.setHeader('Set-Cookie', createSessionCookie(token));

            let destination = '/admin.html';
            if (user.role === 'client') {
                if (hasSub) {
                    destination = '/client.html';
                } else {
                    const order = await db.findOrderForClient(user.email);
                    const code = order ? order.code_client : '';
                    destination = `/suivi.html${code ? '?code=' + code : ''}`;
                }
            }

            return res.status(200).json({
                success: true,
                token: token,
                redirect: destination,
                hasSubscription: hasSub,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    badge: user.badge,
                    hasSubscription: hasSub
                }
            });
        }

        // ==========================================
        // ROUTE: POST/GET /api/auth/logout
        // ==========================================
        if (pathname === '/api/auth/logout' || action === 'logout') {
            res.setHeader('Set-Cookie', createClearSessionCookie());
            if (req.method === 'GET') {
                res.writeHead(302, { Location: '/login.html?logout=true' });
                return res.end();
            }
            return res.status(200).json({ success: true, redirect: '/login.html' });
        }

        // ==========================================
        // ROUTE: GET /api/auth/me
        // ==========================================
        if (pathname === '/api/auth/me' || action === 'auth-me') {
            const user = getSessionUser(req);
            if (!user) {
                return res.status(401).json({ authenticated: false, error: 'Non authentifié.' });
            }
            return res.status(200).json({ authenticated: true, user });
        }

        // ==========================================
        // ROUTE: ADMIN GET ORDERS (admin-fetch-all)
        // ==========================================
        if (pathname === '/api/admin/orders' || action === 'admin-fetch-all') {
            const user = getSessionUser(req);
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ success: false, error: 'Accès refusé. Rôle administrateur requis.' });
            }

            const orders = await db.getAllOrders();
            const sav = await db.getAllSavTickets();

            // Transform to format expected by admin.html
            const formattedOrders = orders.map(o => ({
                id: String(o.id),
                fields: {
                    Entreprise: o.entreprise,
                    Formule: o.formule,
                    'Nom et prénom': o.nom_client,
                    Date: o.created_at,
                    'Etape commande': o.etape,
                    'Date livraison prevue': o.date_livraison_prevue,
                    'Notes atelier': o.notes_configuration,
                    Message: o.message_client,
                    'Derniere modif par': o.derniere_modif_par,
                    Telephone: o.telephone,
                    Statut: [o.statut],
                    Email: o.email,
                    Adresse: o.adresse,
                    'Code Client': o.code_client,
                    Prix: o.prix,
                    Lien: o.lien_google,
                    'Lien menu': o.lien_menu || '',
                    'Type commerce': o.type_commerce || 'commerce',
                    'Type action': o.type_action || 'avis_google',
                    'Abonnement': o.has_subscription === true ? 'Abonné Pro (10€/m)' : 'Sans abonnement',
                    'Abonnement statut': o.has_subscription === true,
                    'Reception client': o.reception_client
                }
            }));

            const formattedSav = sav.map(s => ({
                id: String(s.id),
                fields: {
                    'Type de probleme': s.probleme,
                    Email: s.email,
                    Description: s.description,
                    'Localisation SAV': s.localisation,
                    Client: s.client_nom,
                    Statut: [s.statut],
                    Date: s.created_at,
                    Telephone: s.telephone,
                    'Code Commande': s.code_commande,
                    Entreprise: s.entreprise
                }
            }));

            return res.status(200).json({
                success: true,
                currentUser: user,
                orders: formattedOrders,
                devis: [],
                sav: formattedSav
            });
        }

        // ==========================================
        // ROUTE: ADMIN UPDATE ORDER
        // ==========================================
        if (pathname === '/api/admin/orders/update' || action === 'admin-update-order') {
            const user = getSessionUser(req);
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ success: false, error: 'Accès refusé. Rôle administrateur requis.' });
            }

            const recordId = body.recordId || body.id;
            const fields = body.fields || {};
            const modifier = `${user.name || user.username} (${user.badge || 'Admin'})`;

            const updated = await db.updateOrder(recordId, fields, modifier);
            return res.status(200).json({ success: true, order: updated });
        }

        // ==========================================
        // ROUTE: ADMIN DELETE ORDER
        // ==========================================
        if (pathname === '/api/admin/orders/delete' || action === 'admin-delete-order') {
            let user = getSessionUser(req);
            if (!user && body.adminToken) {
                user = verifyJwt(body.adminToken);
            }
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ success: false, error: 'Accès refusé. Rôle administrateur requis.' });
            }

            const recordId = body.recordId || body.id || body.orderId || body.codeClient;
            if (!recordId) {
                return res.status(400).json({ success: false, error: 'Identifiant de commande manquant.' });
            }

            const deleted = await db.deleteOrder(recordId);
            return res.status(200).json({ success: true, deletedOrder: deleted });
        }

        // ==========================================
        // ROUTE: ORDER CREATE (from checkout)
        // ==========================================
        if (pathname === '/api/order/create' || pathname === '/api/order' || action === 'create-order') {
            const orderData = {
                entreprise: body.entreprise || body.business,
                nom: body.nom || body.name,
                email: body.email,
                telephone: body.telephone || body.phone,
                motDePasse: body.motDePasse || body.password,
                codeClient: body.codeClient,
                adresse: body.adresse || body.address,
                lienGoogle: body.lienGoogle || body.lien_google,
                lienMenu: body.lienMenu || body.lien_menu,
                typeCommerce: body.typeCommerce || body.type_commerce || 'commerce',
                typeAction: body.typeAction || body.type_action || 'avis_google',
                hasSubscription: body.hasSubscription === true || body.hasSubscription === 'true' || body.has_subscription === true,
                formule: body.formule,
                prix: body.prix,
                message: body.message
            };

            const created = await db.createOrder(orderData);
            return res.status(200).json({
                success: true,
                order: created,
                codeClient: created.code_client,
                hasSubscription: created.has_subscription === true
            });
        }

        // ==========================================
        // ROUTE: PUBLIC ORDER TRACKING LOOKUP (No login needed)
        // ==========================================
        if (pathname === '/api/tracking/lookup' || pathname === '/api/tracking' || action === 'tracking-lookup') {
            const queryParam = url.searchParams.get('code') || url.searchParams.get('email') || url.searchParams.get('q');
            const searchKey = (queryParam || body.code || body.email || body.query || '').trim();

            if (!searchKey) {
                return res.status(400).json({ success: false, error: 'Numéro de commande ou email requis.' });
            }

            const tracking = await db.findPublicTracking(searchKey);
            if (!tracking) {
                return res.status(404).json({ success: false, error: 'Aucune commande trouvée avec cette référence.' });
            }

            return res.status(200).json({ success: true, tracking });
        }

        // ==========================================
        // ROUTE: CLIENT GET ORDER
        // ==========================================
        if (pathname === '/api/client/order' || (action === 'client-login' && req.method === 'POST')) {
            const email = (body.email || '').trim().toLowerCase();
            const pwd = (body.password || body.motDePasse || '').trim();

            const order = await db.findOrderForClient(email, body.codeClient);
            if (!order) {
                return res.status(404).json({ success: false, error: 'Aucune commande trouvée.' });
            }

            return res.status(200).json({
                success: true,
                order: {
                    orderId: String(order.id),
                    codeClient: order.code_client,
                    name: order.nom_client,
                    business: order.entreprise,
                    email: order.email,
                    phone: order.telephone,
                    address: order.adresse,
                    googleLink: order.lien_google,
                    lienMenu: order.lien_menu || '',
                    typeCommerce: order.type_commerce || 'commerce',
                    typeAction: order.type_action || 'avis_google',
                    hasSubscription: Boolean(order.has_subscription),
                    formule: order.formule,
                    prix: `${order.prix}€`,
                    date: order.created_at,
                    status: order.statut,
                    etape: order.etape,
                    notesAtelier: order.notes_configuration,
                    dateLivraisonPrevue: order.date_livraison_prevue,
                    receptionClient: order.reception_client
                }
            });
        }

        // ==========================================
        // ROUTE: CLIENT CONFIRM RECEPTION
        // ==========================================
        if (pathname === '/api/client/confirm' || action === 'confirm-reception') {
            const orderId = body.recordId || body.orderId;
            const updated = await db.confirmOrderReception(orderId);
            return res.status(200).json({ success: true, order: updated });
        }

        // ==========================================
        // ROUTE: CLIENT CREATE SAV TICKET
        // ==========================================
        if (pathname === '/api/client/sav' || action === 'create-sav') {
            const ticket = await db.createSavTicket({
                codeCommande: body.codeCommande || 'TAP-0000',
                nom: body.nom || 'Client',
                email: body.email,
                telephone: body.telephone,
                entreprise: body.entreprise,
                probleme: body.probleme,
                description: body.description,
                localisation: body.localisation
            });
            return res.status(200).json({ success: true, ticket });
        }

        // Default endpoint healthcheck
        return res.status(200).json({
            status: 'online',
            service: 'TapTapNFC Secure Authentication & Database Engine',
            version: '2.0.0'
        });

    } catch (err) {
        console.error('API execution error:', err);
        return res.status(500).json({ success: false, error: 'Erreur interne du serveur.', details: err.message });
    }
};
