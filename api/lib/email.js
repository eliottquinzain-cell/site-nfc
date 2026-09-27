/**
 * TapTapNFC - Module d'Envoi d'Emails Professionnels
 * Gère l'envoi des confirmations de commande, alertes et réinitialisations de mot de passe
 */

const MAKE_WEBHOOK = process.env.MAKE_WEBHOOK || 'https://hook.eu1.make.com/ddos8ollnucv5woxyb6hlq6xdafuvit6';
const SITE_URL = process.env.SITE_URL || 'https://taptapnfc.vercel.app';
const SUPPORT_EMAIL = 'equinzain@gmail.com';
const SUPPORT_PHONE = '06 12 34 56 78';

/**
 * Génère le template HTML responsive pour la confirmation de commande
 */
function buildOrderConfirmationHtml(order) {
    const nom = order.nom || order.nom_client || 'Client';
    const entreprise = order.entreprise || order.business || 'Votre Établissement';
    const codeClient = order.codeClient || order.code_client || 'TAP-0000';
    const formule = order.formule || 'Pack 2 cartes NFC';
    const prix = order.prix || '70';
    const adresse = order.adresse || 'À convenir avec notre atelier';
    const email = order.email || '';
    const hasSub = order.hasSubscription === true || order.has_subscription === true;
    const isPaid = (order.statut || '').includes('Payée') || order.paid === true;

    const accountSectionHtml = hasSub ? `
        <!-- Espace Client Pro Activé -->
        <table role="presentation" width="100%" style="background:linear-gradient(135deg, rgba(56,189,248,0.1), rgba(34,197,94,0.08));border:1px solid rgba(56,189,248,0.35);border-radius:12px;padding:20px;margin-bottom:24px;">
            <tr>
                <td>
                    <div style="font-size:12px;color:#38bdf8;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;">
                        ⭐ Option Espace Client Pro (10 €/mois) Activée
                    </div>
                    <p style="margin:0 0 12px;font-size:13px;color:#e5e7eb;line-height:1.5;">
                        Votre espace personnel vous permet de <strong>modifier les liens de redirection de vos cartes à tout moment</strong> (idéal pour mettre à jour votre carte de saison ou lien d'avis) et de consulter vos statistiques en temps réel.
                    </p>
                    <table role="presentation" width="100%" style="background-color:#111111;border:1px solid #222222;border-radius:8px;padding:12px;margin-bottom:14px;font-size:13px;">
                        <tr>
                            <td style="color:#9ca3af;padding:3px 0;">Identifiant :</td>
                            <td style="color:#ffffff;font-weight:600;text-align:right;">${email} <span style="color:#6b7280;">(ou code ${codeClient})</span></td>
                        </tr>
                        <tr>
                            <td style="color:#9ca3af;padding:3px 0;">Mot de passe :</td>
                            <td style="color:#4ade80;font-weight:600;text-align:right;">Celui choisi lors de votre commande</td>
                        </tr>
                    </table>
                    <div style="text-align:center;">
                        <a href="${SITE_URL}/client.html" style="display:inline-block;background-color:#38bdf8;color:#050505;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:8px;">
                            Accéder à mon Espace Client Pro ➔
                        </a>
                    </div>
                </td>
            </tr>
        </table>
    ` : `
        <!-- Option Carte Seule (Suivi léger) -->
        <table role="presentation" width="100%" style="background-color:#181818;border:1px solid #2a2a2a;border-radius:12px;padding:18px;margin-bottom:24px;">
            <tr>
                <td>
                    <div style="font-size:12px;color:#4ade80;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;">
                        📦 Suivi de Commande en Direct
                    </div>
                    <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;line-height:1.5;">
                        Vos cartes sont programmées avec un lien fixe définitif. Suivez l'avancement de votre commande et les étapes de gravure à tout moment sans mot de passe :
                    </p>
                    <div style="text-align:center;">
                        <a href="${SITE_URL}/suivi.html?code=${encodeURIComponent(codeClient)}" style="display:inline-block;background-color:#22c55e;color:#050505;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:8px;">
                            Suivre l'avancement de ma carte ➔
                        </a>
                    </div>
                </td>
            </tr>
        </table>
    `;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de commande - TapTapNFC</title>
</head>
<body style="margin:0;padding:0;background-color:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#080808;padding:30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width:620px;background-color:#121212;border:1px solid #262626;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
                    
                    <!-- En-tête -->
                    <tr>
                        <td style="padding:32px 30px 24px;background-color:#161616;border-bottom:1px solid #262626;text-align:center;">
                            <div style="display:inline-block;padding:6px 14px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:50px;color:#4ade80;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:12px;">
                                ${isPaid ? '✓ Commande & Paiement Confirmés' : '✓ Commande Validée'}
                            </div>
                            <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
                                ⚡ TapTap<span style="color:#22c55e;">NFC</span>
                            </h1>
                            <p style="margin:6px 0 0;font-size:14px;color:#9ca3af;">
                                Vos cartes sans contact haute qualité pour ${entreprise}
                            </p>
                        </td>
                    </tr>

                    <!-- Contenu Principal -->
                    <tr>
                        <td style="padding:28px 28px 16px;">
                            <p style="margin:0 0 14px;font-size:16px;color:#f3f4f6;">
                                Bonjour <strong>${nom}</strong>,
                            </p>
                            <p style="margin:0 0 20px;font-size:14px;color:#d1d5db;line-height:1.6;">
                                Merci infiniment pour votre confiance ! Votre commande pour <strong style="color:#ffffff;">« ${entreprise} »</strong> a bien été enregistrée et transmise à notre atelier.
                            </p>

                            <!-- ENCADRÉ IMPORTANT : NOUS VOUS CONTACTONS SOUS 24H -->
                            <table role="presentation" width="100%" style="background:rgba(245,158,11,0.08);border:1.5px solid rgba(245,158,11,0.35);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
                                <tr>
                                    <td>
                                        <div style="display:flex;align-items:center;margin-bottom:8px;">
                                            <span style="font-size:20px;margin-right:10px;">📞</span>
                                            <strong style="color:#fbbf24;font-size:14px;letter-spacing:-0.01em;">
                                                Nous allons vous contacter sous 24 h pour les détails de personnalisation
                                            </strong>
                                        </div>
                                        <p style="margin:0;font-size:13px;color:#e5e7eb;line-height:1.55;">
                                            Notre équipe prendra contact avec vous (par téléphone ou email) sous <strong>24 heures ouvrées</strong> pour valider les informations de configuration :
                                        </p>
                                        <ul style="margin:10px 0 0 16px;padding:0;font-size:13px;color:#d1d5db;line-height:1.6;">
                                            <li>Votre <strong>logo en haute définition</strong> pour la gravure laser sur mesure</li>
                                            <li>Le <strong>lien exact</strong> à programmer (fiche Google Avis, Menu numérique / carte des vins, ou réseaux sociaux)</li>
                                            <li>L'horaire et les consignes pour la livraison en main propre ou l'expédition sécurisée</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>

                            <!-- Récapitulatif Commande -->
                            <table role="presentation" width="100%" style="background-color:#181818;border:1px solid #282828;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
                                <tr>
                                    <td>
                                        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:10px;">
                                            Récapitulatif de votre commande
                                        </div>
                                        <table role="presentation" width="100%" style="font-size:13.5px;color:#d1d5db;">
                                            <tr>
                                                <td style="padding:5px 0;color:#9ca3af;">Numéro de référence :</td>
                                                <td style="padding:5px 0;text-align:right;font-weight:700;color:#38bdf8;font-family:monospace;font-size:15px;">${codeClient}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:5px 0;color:#9ca3af;">Offre sélectionnée :</td>
                                                <td style="padding:5px 0;text-align:right;font-weight:600;color:#ffffff;">${formule}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:5px 0;color:#9ca3af;">Montant :</td>
                                                <td style="padding:5px 0;text-align:right;font-weight:700;color:#4ade80;">${prix} €</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:5px 0;color:#9ca3af;">Statut paiement :</td>
                                                <td style="padding:5px 0;text-align:right;font-weight:600;color:#ffffff;">${isPaid ? '💳 Réglé par Carte (Stripe)' : '🤝 Paiement à réception'}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:5px 0;color:#9ca3af;">Adresse de livraison :</td>
                                                <td style="padding:5px 0;text-align:right;color:#e5e7eb;">${adresse}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Section Accès Client -->
                            ${accountSectionHtml}

                            <!-- Prochaines étapes de fabrication -->
                            <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:12px;">
                                Calendrier de traitement :
                            </div>
                            <table role="presentation" width="100%" style="font-size:13px;color:#9ca3af;margin-bottom:24px;">
                                <tr>
                                    <td width="26" valign="top" style="padding-bottom:10px;">
                                        <span style="display:inline-block;width:18px;height:18px;background:#262626;color:#ffffff;border-radius:50%;text-align:center;line-height:18px;font-weight:700;font-size:11px;">1</span>
                                    </td>
                                    <td style="padding-bottom:10px;">
                                        <strong style="color:#ffffff;">Prise de contact & validation (24h) :</strong> Recueil de votre logo et validation de l'adresse de redirection.
                                    </td>
                                </tr>
                                <tr>
                                    <td width="26" valign="top" style="padding-bottom:10px;">
                                        <span style="display:inline-block;width:18px;height:18px;background:#262626;color:#ffffff;border-radius:50%;text-align:center;line-height:18px;font-weight:700;font-size:11px;">2</span>
                                    </td>
                                    <td style="padding-bottom:10px;">
                                        <strong style="color:#ffffff;">Programmation & Gravure :</strong> Écriture des puces NFC haute portée et gravure laser personnalisée.
                                    </td>
                                </tr>
                                <tr>
                                    <td width="26" valign="top">
                                        <span style="display:inline-block;width:18px;height:18px;background:#262626;color:#ffffff;border-radius:50%;text-align:center;line-height:18px;font-weight:700;font-size:11px;">3</span>
                                    </td>
                                    <td>
                                        <strong style="color:#ffffff;">Livraison :</strong> Livraison offerte en main propre sur la métropole lilloise ou expédition suivie 48h.
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- Pied de page -->
                    <tr>
                        <td style="padding:22px 28px;background-color:#101010;border-top:1px solid #262626;text-align:center;font-size:12px;color:#6b7280;line-height:1.6;">
                            <p style="margin:0 0 6px;">
                                Une question ou un fichier à nous faire parvenir dès maintenant ?
                            </p>
                            <p style="margin:0 0 10px;color:#9ca3af;">
                                Eliott &bull; 📞 <strong>${SUPPORT_PHONE}</strong> &bull; ✉️ <a href="mailto:${SUPPORT_EMAIL}" style="color:#38bdf8;text-decoration:none;">${SUPPORT_EMAIL}</a>
                            </p>
                            <p style="margin:0;font-size:11px;color:#4b5563;">
                                © 2026 TapTapNFC &bull; Cartes sans contact professionnelles &bull; Métropole Lilloise & Région Hauts-de-France
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Envoie un email de réinitialisation de mot de passe sécurisé
 */
function buildPasswordResetHtml({ name, resetUrl, codeClient }) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Réinitialisation de mot de passe - TapTapNFC</title>
</head>
<body style="margin:0;padding:0;background-color:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#080808;padding:30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width:540px;background-color:#141414;border:1px solid #262626;border-radius:16px;padding:32px 28px;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
                    <tr>
                        <td align="center">
                            <div style="font-size:28px;margin-bottom:12px;">🔒</div>
                            <h2 style="margin:0 0 8px;font-size:20px;color:#ffffff;font-weight:700;">
                                Réinitialisation de votre mot de passe
                            </h2>
                            <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
                                TapTapNFC Espace Client
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="margin:0 0 16px;font-size:14px;color:#f3f4f6;">
                                Bonjour <strong>${name || 'Client'}</strong>,
                            </p>
                            <p style="margin:0 0 20px;font-size:13.5px;color:#d1d5db;line-height:1.6;">
                                Une demande de réinitialisation de mot de passe a été demandée pour votre compte ${codeClient ? `associé à la commande <strong>${codeClient}</strong>` : ''}.
                            </p>
                            <div style="text-align:center;margin:28px 0;">
                                <a href="${resetUrl}" style="display:inline-block;background-color:#22c55e;color:#050505;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;box-shadow:0 4px 14px rgba(34,197,94,0.35);">
                                    Définir un nouveau mot de passe ➔
                                </a>
                            </div>
                            <p style="margin:0 0 16px;font-size:12px;color:#9ca3af;line-height:1.5;">
                                Ce lien sécurisé est valable pendant <strong>30 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail, votre mot de passe restera inchangé.
                            </p>
                            <div style="padding-top:16px;border-top:1px solid #242424;font-size:11px;color:#6b7280;text-align:center;">
                                Si le bouton ne fonctionne pas, copiez-collez ce lien :<br>
                                <a href="${resetUrl}" style="color:#38bdf8;word-break:break-all;">${resetUrl}</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Dispatcher principal d'email :
 * 1. Envoie via Make Webhook (ou Resend si clé API configurée)
 * 2. Retourne le résultat du dispatch
 */
async function sendOrderConfirmationEmail(orderData) {
    const email = (orderData.email || '').trim().toLowerCase();
    if (!email) {
        console.warn('[Email] Aucun email renseigné pour la commande');
        return { success: false, error: 'Email manquant' };
    }

    const htmlContent = buildOrderConfirmationHtml(orderData);
    const subject = `⚡ Confirmation de votre commande TapTapNFC - ${orderData.codeClient || orderData.code_client || ''}`;

    // 1. Envoi via Make Webhook (intégré aux flux Make existants)
    try {
        const payload = {
            action: 'send_email',
            emailType: 'confirmation_commande',
            to: email,
            subject: subject,
            nom: orderData.nom || orderData.nom_client || '',
            entreprise: orderData.entreprise || orderData.business || '',
            codeClient: orderData.codeClient || orderData.code_client || '',
            formule: orderData.formule || '',
            prix: orderData.prix || '',
            adresse: orderData.adresse || '',
            hasSubscription: orderData.hasSubscription === true || orderData.has_subscription === true,
            htmlContent: htmlContent,
            contactNotice: "Nous allons vous contacter sous 24h ouvrées pour faire le point sur vos besoins et recueillir votre logo haute définition.",
            date: new Date().toISOString()
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const resp = await fetch(MAKE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeout);

        console.log(`[Email] Notification webhook envoyée pour ${email} (status: ${resp.status})`);
    } catch (e) {
        console.warn('[Email] Avertissement envoi webhook Make:', e.message);
    }

    // 2. Si RESEND_API_KEY est configurée dans Vercel, envoi direct via Resend API
    if (process.env.RESEND_API_KEY) {
        try {
            const resendResp = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'TapTapNFC <commandes@taptapnfc.com>',
                    to: [email],
                    subject: subject,
                    html: htmlContent
                })
            });
            const resendData = await resendResp.json();
            console.log('[Email] Envoi direct Resend réussi:', resendData.id);
            return { success: true, provider: 'resend', id: resendData.id };
        } catch (e) {
            console.warn('[Email] Erreur Resend direct:', e.message);
        }
    }

    return {
        success: true,
        sent: true,
        to: email,
        subject: subject,
        provider: 'make_webhook'
    };
}

/**
 * Dispatcher email pour la réinitialisation de mot de passe
 */
async function sendPasswordResetEmail({ email, name, resetToken, codeClient }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: 'Email manquant' };

    const resetUrl = `${SITE_URL}/login.html?reset_token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;
    const htmlContent = buildPasswordResetHtml({ name, resetUrl, codeClient });
    const subject = '🔒 Réinitialisation de votre mot de passe TapTapNFC';

    try {
        const payload = {
            action: 'send_email',
            emailType: 'password_reset',
            to: cleanEmail,
            subject: subject,
            name: name,
            resetUrl: resetUrl,
            resetToken: resetToken,
            codeClient: codeClient || '',
            htmlContent: htmlContent,
            date: new Date().toISOString()
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        await fetch(MAKE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeout);
    } catch(e) {
        console.warn('[Email] Erreur envoi webhook reset:', e.message);
    }

    if (process.env.RESEND_API_KEY) {
        try {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'TapTapNFC <support@taptapnfc.com>',
                    to: [cleanEmail],
                    subject: subject,
                    html: htmlContent
                })
            });
        } catch(e) {
            console.warn('[Email] Erreur Resend reset:', e.message);
        }
    }

    return { success: true, resetUrl: resetUrl };
}

module.exports = {
    buildOrderConfirmationHtml,
    buildPasswordResetHtml,
    sendOrderConfirmationEmail,
    sendPasswordResetEmail
};
