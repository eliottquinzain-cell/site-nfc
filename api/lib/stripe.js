/**
 * Stripe Test Mode Integration - TapTapNFC
 * Supports Stripe Checkout Sessions, Payments, Subscriptions, and Verification
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51UKItgI9cnB6xGY8iGMWi7wZQVMgmmlS98V0tIelOiCtoTBboNdtjQwOTVz3sjxL2HSalwncGVwyeBHr7IrsYBGT00NInsd8D9';

/**
 * Create a Stripe Checkout session for one-time payment or recurring subscription
 */
async function createCheckoutSession(orderData, origin) {
    const secretKey = STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY non configurée');
    }

    const codeClient = orderData.codeClient || ('TAP-' + Math.floor(1000 + Math.random() * 9000));
    const cart = Array.isArray(orderData.cart) && orderData.cart.length > 0 ? orderData.cart : [
        { label: orderData.formule || 'Pack 2 cartes NFC TapTapNFC', price: parseFloat(orderData.prix || 70) }
    ];

    const hasSub = orderData.hasSubscription === true || orderData.hasSubscription === 'true' || orderData.has_subscription === true;
    const business = orderData.entreprise || orderData.business || 'Mon Établissement';
    const email = (orderData.email || '').trim().toLowerCase();

    const params = new URLSearchParams();
    params.append('success_url', `${origin}/?session_id={CHECKOUT_SESSION_ID}&order_code=${encodeURIComponent(codeClient)}`);
    params.append('cancel_url', `${origin}/#commander`);
    
    if (email) {
        params.append('customer_email', email);
    }

    if (hasSub) {
        params.append('mode', 'subscription');
    } else {
        params.append('mode', 'payment');
    }

    // Line item 1: Cart pack (Cards)
    const packTitle = cart[0].label ? `${cart[0].label} - ${business}` : `Cartes NFC - ${business}`;
    const packPriceInCents = Math.round((parseFloat(cart[0].price) || 70) * 100);

    params.append('line_items[0][price_data][currency]', 'eur');
    params.append('line_items[0][price_data][unit_amount]', String(packPriceInCents));
    params.append('line_items[0][price_data][product_data][name]', packTitle);
    params.append('line_items[0][price_data][product_data][description]', 'Gravure laser personnalisée, programmation des puces et livraison incluse');
    params.append('line_items[0][quantity]', '1');

    // Line item 2 (if subscription):
    if (hasSub) {
        params.append('line_items[1][price_data][currency]', 'eur');
        params.append('line_items[1][price_data][unit_amount]', '1000'); // 10.00 € / mois
        params.append('line_items[1][price_data][recurring][interval]', 'month');
        params.append('line_items[1][price_data][product_data][name]', 'Abonnement Espace Client Pro (10 €/mois)');
        params.append('line_items[1][price_data][product_data][description]', 'Redirection dynamique des cartes à distance & statistiques de scan en direct');
        params.append('line_items[1][quantity]', '1');
        params.append('subscription_data[trial_period_days]', '30');
    }

    // Order metadata for fulfillment
    const metadata = {
        codeClient: codeClient,
        business: business,
        nom: orderData.nom || orderData.nom_client || '',
        email: email,
        telephone: orderData.telephone || '',
        adresse: orderData.adresse || '',
        typeCommerce: orderData.typeCommerce || 'commerce',
        typeAction: orderData.typeAction || 'avis_google',
        lienGoogle: orderData.lienGoogle || '',
        lienMenu: orderData.lienMenu || '',
        hasSubscription: String(hasSub),
        formule: cart[0].label || 'Pack NFC',
        prix: String(cart[0].price || 70),
        message: orderData.message || '',
        password: orderData.motDePasse || orderData.password || ''
    };

    for (const [k, v] of Object.entries(metadata)) {
        if (v !== undefined && v !== null) {
            params.append(`metadata[${k}]`, String(v).slice(0, 500));
        }
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    const session = await response.json();
    if (!response.ok) {
        throw new Error(session.error ? session.error.message : 'Erreur Stripe lors de la création de la session');
    }

    return {
        id: session.id,
        url: session.url,
        codeClient: codeClient
    };
}

/**
 * Retrieve a Stripe Checkout session by ID
 */
async function retrieveCheckoutSession(sessionId) {
    const secretKey = STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY non configurée');
    }

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${secretKey}`
        }
    });

    const session = await response.json();
    if (!response.ok) {
        throw new Error(session.error ? session.error.message : 'Session de paiement introuvable');
    }

    return session;
}

module.exports = {
    STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY,
    createCheckoutSession,
    retrieveCheckoutSession
};
