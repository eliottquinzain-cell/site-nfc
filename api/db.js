const { hashPassword } = require('./lib/auth');

let Pool;
try {
    Pool = require('pg').Pool;
} catch (e) {
    Pool = null;
}

function getDatabaseUrl() {
    return process.env.DATABASE_URL || 
           process.env.POSTGRES_URL || 
           process.env.POSTGRES_DATABASE_URL || 
           process.env.POSTGRES_URL_NON_POOLING || 
           process.env.POSTGRES_PRISMA_URL;
}

let pool = null;
function getPool() {
    if (!pool && Pool) {
        const dbUrl = getDatabaseUrl();
        if (dbUrl) {
            pool = new Pool({
                connectionString: dbUrl,
                ssl: { rejectUnauthorized: false }
            });
        }
    }
    return pool;
}

// In-memory fallback cache when DATABASE_URL is not yet provisioned
const memoryStore = {
    users: [],
    orders: [
        {
            id: 1,
            code_client: 'TAP-9901',
            entreprise: 'Brasserie Le Flandre',
            nom_client: 'Alexandre Dupont',
            telephone: '06 99 88 77 66',
            email: 'alexandre.dupont@test-flandre.fr',
            adresse: '12 rue Royale, 59000 Lille',
            lien_google: 'https://g.page/r/brasserie-flandre',
            formule: 'Pack 2 cartes NFC',
            prix: 70,
            statut: 'En cours',
            etape: '2. Puces NFC programmées',
            notes_configuration: 'Puces programmées avec le lien court. Gravure logo mat.',
            date_livraison_prevue: 'Demain 14h30',
            reception_client: true,
            created_at: new Date('2026-09-24T18:00:00Z')
        },
        {
            id: 2,
            code_client: 'TAP-8842',
            entreprise: 'Boulangerie du Théâtre',
            nom_client: 'Thomas Martin',
            telephone: '06 12 34 56 78',
            email: 'contact@boulangerie-theatre.fr',
            adresse: '4 Place du Théâtre, 59000 Lille',
            lien_google: 'https://g.page/r/boulangerie-theatre',
            formule: 'Pack 2 cartes NFC',
            prix: 70,
            statut: 'En cours',
            etape: '2. Puces NFC programmées',
            notes_configuration: 'Configuration validée.',
            date_livraison_prevue: 'En cours de préparation',
            reception_client: false,
            created_at: new Date('2026-09-24T17:12:00Z')
        }
    ],
    sav_tickets: [
        {
            id: 1,
            code_commande: 'TAP-9901',
            client_nom: 'Alexandre Dupont',
            email: 'alexandre.dupont@test-flandre.fr',
            telephone: '06 99 88 77 66',
            entreprise: 'Brasserie Le Flandre',
            probleme: 'Puce NFC ne réagit plus',
            description: 'La carte du comptoir a cessé de biper.',
            localisation: 'Lille métropole',
            statut: 'Nouveau ticket',
            created_at: new Date('2026-09-24T18:05:00Z')
        }
    ]
};

// Default seed admin accounts with plain text passwords to be hashed on initialization
const DEFAULT_ADMINS = [
    {
        username: 'eliott.admin',
        email: 'eliott.quinzain@icloud.com',
        plainPassword: 'El!0tt*TapNfc#2026$SecuX',
        role: 'admin',
        name: 'Eliott Quinzain',
        badge: '👑 Direction'
    },
    {
        username: 'config.admin',
        email: 'config@taptapnfc.fr',
        plainPassword: 'Atel!er#NfcProg$2026*Prod99',
        role: 'admin',
        name: 'Responsable Technique & Configuration',
        badge: '⚡ Configuration'
    },
    {
        username: 'support.admin',
        email: 'support@taptapnfc.fr',
        plainPassword: 'Supp0rt#SavLivrais0n$2026*Care77',
        role: 'admin',
        name: 'Support Client & Logistique',
        badge: '🛡️ SAV & Suivi'
    }
];

let dbInitialized = false;

/**
 * Initialize PostgreSQL Schema and seed Admin accounts
 */
async function initDb() {
    if (dbInitialized) return;

    // Seed in-memory store admin accounts with bcrypt hashes
    if (memoryStore.users.length === 0) {
        for (const admin of DEFAULT_ADMINS) {
            const hash = await hashPassword(admin.plainPassword);
            memoryStore.users.push({
                id: memoryStore.users.length + 1,
                username: admin.username,
                email: admin.email,
                password_hash: hash,
                role: admin.role,
                name: admin.name,
                badge: admin.badge,
                created_at: new Date()
            });
        }
    }

    // If PostgreSQL pool is available, create schema & seed
    const activePool = getPool();
    if (activePool) {
        try {
            await activePool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE,
                    email VARCHAR(255) UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'client',
                    name VARCHAR(255),
                    badge VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    code_client VARCHAR(50) UNIQUE,
                    entreprise VARCHAR(255),
                    nom_client VARCHAR(255),
                    telephone VARCHAR(50),
                    email VARCHAR(255),
                    adresse TEXT,
                    lien_google TEXT,
                    formule VARCHAR(100),
                    prix NUMERIC(10, 2),
                    statut VARCHAR(50) DEFAULT 'Nouvelle',
                    etape VARCHAR(100) DEFAULT '1. Prise en charge',
                    notes_configuration TEXT,
                    date_livraison_prevue VARCHAR(100),
                    reception_client BOOLEAN DEFAULT FALSE,
                    message_client TEXT,
                    derniere_modif_par VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS sav_tickets (
                    id SERIAL PRIMARY KEY,
                    code_commande VARCHAR(50),
                    client_nom VARCHAR(255),
                    email VARCHAR(255),
                    telephone VARCHAR(50),
                    entreprise VARCHAR(255),
                    probleme VARCHAR(255),
                    description TEXT,
                    localisation VARCHAR(100),
                    statut VARCHAR(50) DEFAULT 'Nouveau ticket',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Seed admins if not already present
            for (const admin of DEFAULT_ADMINS) {
                const existing = await activePool.query(
                    'SELECT id FROM users WHERE username = $1 OR email = $2',
                    [admin.username, admin.email]
                );
                if (existing.rows.length === 0) {
                    const hash = await hashPassword(admin.plainPassword);
                    await activePool.query(
                        'INSERT INTO users (username, email, password_hash, role, name, badge) VALUES ($1, $2, $3, $4, $5, $6)',
                        [admin.username, admin.email, hash, admin.role, admin.name, admin.badge]
                    );
                }
            }

            // Seed initial orders if empty
            const orderCount = await activePool.query('SELECT count(*) FROM orders');
            if (parseInt(orderCount.rows[0].count, 10) === 0) {
                for (const o of memoryStore.orders) {
                    await activePool.query(
                        `INSERT INTO orders (
                            code_client, entreprise, nom_client, telephone, email, 
                            adresse, lien_google, formule, prix, statut, etape, 
                            notes_configuration, date_livraison_prevue, reception_client, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                        [
                            o.code_client, o.entreprise, o.nom_client, o.telephone, o.email,
                            o.adresse, o.lien_google, o.formule, o.prix, o.statut, o.etape,
                            o.notes_configuration, o.date_livraison_prevue, o.reception_client, o.created_at
                        ]
                    );
                }
            }

            // Seed demo client user if not exists
            const clientExists = await activePool.query("SELECT id FROM users WHERE email = 'alexandre.dupont@test-flandre.fr'");
            if (clientExists.rows.length === 0) {
                const clientHash = await hashPassword('client123');
                await activePool.query(
                    "INSERT INTO users (username, email, password_hash, role, name, badge) VALUES ($1, $2, $3, 'client', $4, '👤 Client')",
                    ['alexandre.dupont@test-flandre.fr', 'alexandre.dupont@test-flandre.fr', clientHash, 'Alexandre Dupont']
                );
            }

            console.log('PostgreSQL Database schema initialized and seeded successfully');
            dbInitialized = true;
        } catch (err) {
            console.error('PostgreSQL connection/init error, falling back to memory store:', err.message);
        }
    } else {
        console.log('No DATABASE_URL configured. Running with in-memory store.');
        dbInitialized = true;
    }
}

/**
 * Find user by username or email
 */
async function findUserByUsernameOrEmail(identifier) {
    await initDb();
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();

    if (pool) {
        try {
            const res = await pool.query(
                'SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1',
                [clean]
            );
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            console.error('Postgres error in findUserByUsernameOrEmail:', e.message);
        }
    }

    // In-memory fallback
    return memoryStore.users.find(u => 
        (u.username && u.username.toLowerCase() === clean) || 
        (u.email && u.email.toLowerCase() === clean)
    ) || null;
}

/**
 * Create or register a client user
 */
async function createClientUser({ email, password, name, phone }) {
    await initDb();
    const cleanEmail = email.trim().toLowerCase();
    const hash = await hashPassword(password);

    if (pool) {
        try {
            const res = await pool.query(
                `INSERT INTO users (username, email, password_hash, role, name, badge)
                 VALUES ($1, $2, $3, 'client', $4, '👤 Client')
                 ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $4
                 RETURNING *`,
                [cleanEmail, cleanEmail, hash, name]
            );
            return res.rows[0];
        } catch (e) {
            console.error('Postgres error in createClientUser:', e.message);
        }
    }

    let existing = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
        existing.password_hash = hash;
        existing.name = name;
        return existing;
    }

    const newUser = {
        id: memoryStore.users.length + 1,
        username: cleanEmail,
        email: cleanEmail,
        password_hash: hash,
        role: 'client',
        name: name,
        badge: '👤 Client',
        created_at: new Date()
    };
    memoryStore.users.push(newUser);
    return newUser;
}

/**
 * Get all orders (for Admin)
 */
async function getAllOrders() {
    await initDb();
    if (pool) {
        try {
            const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
            return res.rows;
        } catch (e) {
            console.error('Postgres error in getAllOrders:', e.message);
        }
    }
    return memoryStore.orders;
}

/**
 * Find order for a client by email or code_client
 */
async function findOrderForClient(email, codeClient) {
    await initDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (codeClient || '').trim().toUpperCase();

    if (pool) {
        try {
            let query = 'SELECT * FROM orders WHERE ';
            let params = [];
            if (cleanCode && cleanEmail) {
                query += '(UPPER(code_client) = $1 OR LOWER(email) = $2) ORDER BY created_at DESC LIMIT 1';
                params = [cleanCode, cleanEmail];
            } else if (cleanCode) {
                query += 'UPPER(code_client) = $1 ORDER BY created_at DESC LIMIT 1';
                params = [cleanCode];
            } else {
                query += 'LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1';
                params = [cleanEmail];
            }
            const res = await pool.query(query, params);
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            console.error('Postgres error in findOrderForClient:', e.message);
        }
    }

    return memoryStore.orders.find(o => 
        (cleanCode && o.code_client && o.code_client.toUpperCase() === cleanCode) ||
        (cleanEmail && o.email && o.email.toLowerCase() === cleanEmail)
    ) || null;
}

/**
 * Update an order (Admin)
 */
async function updateOrder(orderId, fields, modifiedBy) {
    await initDb();
    const numId = parseInt(orderId, 10);

    if (pool && !isNaN(numId)) {
        try {
            const updates = [];
            const values = [];
            let idx = 1;

            if (fields.etape !== undefined) { updates.push(`etape = $${idx++}`); values.push(fields.etape); }
            if (fields.lienGoogle !== undefined) { updates.push(`lien_google = $${idx++}`); values.push(fields.lienGoogle); }
            if (fields.notes !== undefined) { updates.push(`notes_configuration = $${idx++}`); values.push(fields.notes); }
            if (fields.dateLivraison !== undefined) { updates.push(`date_livraison_prevue = $${idx++}`); values.push(fields.dateLivraison); }
            if (fields.statut !== undefined) { updates.push(`statut = $${idx++}`); values.push(fields.statut); }
            if (modifiedBy) { updates.push(`derniere_modif_par = $${idx++}`); values.push(modifiedBy); }

            if (updates.length > 0) {
                values.push(numId);
                const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
                const res = await pool.query(query, values);
                if (res.rows.length > 0) return res.rows[0];
            }
        } catch (e) {
            console.error('Postgres error in updateOrder:', e.message);
        }
    }

    const order = memoryStore.orders.find(o => o.id === numId || o.code_client === orderId);
    if (order) {
        if (fields.etape !== undefined) order.etape = fields.etape;
        if (fields.lienGoogle !== undefined) order.lien_google = fields.lienGoogle;
        if (fields.notes !== undefined) order.notes_configuration = fields.notes;
        if (fields.dateLivraison !== undefined) order.date_livraison_prevue = fields.dateLivraison;
        if (fields.statut !== undefined) order.statut = fields.statut;
        if (modifiedBy) order.derniere_modif_par = modifiedBy;
        return order;
    }

    return null;
}

/**
 * Confirm order reception by client
 */
async function confirmOrderReception(orderId) {
    await initDb();
    const numId = parseInt(orderId, 10);

    if (pool && !isNaN(numId)) {
        try {
            const res = await pool.query(
                `UPDATE orders 
                 SET reception_client = TRUE, 
                     etape = '6. Livrée & Confirmée', 
                     statut = 'Livré' 
                 WHERE id = $1 RETURNING *`,
                [numId]
            );
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            console.error('Postgres error in confirmOrderReception:', e.message);
        }
    }

    const order = memoryStore.orders.find(o => o.id === numId || o.code_client === orderId);
    if (order) {
        order.reception_client = true;
        order.etape = '6. Livrée & Confirmée';
        order.statut = 'Livré';
        return order;
    }
    return null;
}

/**
 * Create a SAV ticket
 */
async function createSavTicket(ticket) {
    await initDb();
    if (pool) {
        try {
            const res = await pool.query(
                `INSERT INTO sav_tickets (code_commande, client_nom, email, telephone, entreprise, probleme, description, localisation)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [
                    ticket.codeCommande,
                    ticket.nom,
                    ticket.email,
                    ticket.telephone,
                    ticket.entreprise,
                    ticket.probleme,
                    ticket.description,
                    ticket.localisation
                ]
            );
            return res.rows[0];
        } catch (e) {
            console.error('Postgres error in createSavTicket:', e.message);
        }
    }

    const newTicket = {
        id: memoryStore.sav_tickets.length + 1,
        code_commande: ticket.codeCommande,
        client_nom: ticket.nom,
        email: ticket.email,
        telephone: ticket.telephone,
        entreprise: ticket.entreprise,
        probleme: ticket.probleme,
        description: ticket.description,
        localisation: ticket.localisation,
        statut: 'Nouveau ticket',
        created_at: new Date()
    };
    memoryStore.sav_tickets.push(newTicket);
    return newTicket;
}

/**
 * Get all SAV tickets (Admin)
 */
async function getAllSavTickets() {
    await initDb();
    if (pool) {
        try {
            const res = await pool.query('SELECT * FROM sav_tickets ORDER BY created_at DESC');
            return res.rows;
        } catch (e) {
            console.error('Postgres error in getAllSavTickets:', e.message);
        }
    }
    return memoryStore.sav_tickets;
}

/**
 * Health and connectivity status
 */
async function getHealthStatus() {
    await initDb();
    const activePool = getPool();
    if (activePool) {
        try {
            const dbCheck = await activePool.query('SELECT current_database(), current_user, version()');
            const userCount = await activePool.query('SELECT count(*) FROM users');
            const orderCount = await activePool.query('SELECT count(*) FROM orders');
            return {
                status: 'ok',
                storage: 'postgresql',
                database: dbCheck.rows[0].current_database,
                user: dbCheck.rows[0].current_user,
                usersCount: parseInt(userCount.rows[0].count, 10),
                ordersCount: parseInt(orderCount.rows[0].count, 10),
                connected: true
            };
        } catch (e) {
            return {
                status: 'error',
                storage: 'postgresql-fallback-memory',
                error: e.message,
                connected: false
            };
        }
    }
    return {
        status: 'ok',
        storage: 'memory',
        note: 'No DATABASE_URL configured yet',
        connected: false
    };
}

module.exports = {
    initDb,
    findUserByUsernameOrEmail,
    createClientUser,
    getAllOrders,
    findOrderForClient,
    updateOrder,
    confirmOrderReception,
    createSavTicket,
    getAllSavTickets,
    getHealthStatus
};
