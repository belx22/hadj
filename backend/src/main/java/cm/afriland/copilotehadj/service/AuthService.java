package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.config.JwtService;
import cm.afriland.copilotehadj.entity.AppUser;
import cm.afriland.copilotehadj.entity.LoginOtp;
import cm.afriland.copilotehadj.entity.PasswordReset;
import cm.afriland.copilotehadj.entity.SmtpSettings;
import cm.afriland.copilotehadj.repository.AppUserRepository;
import cm.afriland.copilotehadj.repository.LoginOtpRepository;
import cm.afriland.copilotehadj.repository.PasswordResetRepository;
import cm.afriland.copilotehadj.repository.SmtpSettingsRepository;
import cm.afriland.copilotehadj.web.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AuthService {

    private static final int MAX_OTP_ATTEMPTS = 5;
    // OTP de réinitialisation du mot de passe : durée courte fixe (5 minutes),
    // indépendante du réglage SMTP otpTtlMinutes utilisé par l'OTP de connexion.
    private static final int RESET_OTP_TTL_MINUTES = 5;

    // Rôles staff soumis à la double authentification (l'encadreur en est exclu :
    // il accède à son espace via passeport + téléphone, pas par ce point d'entrée).
    private static final Set<String> OTP_ROLES =
            Set.of("ADMIN_DSI", "SUPERVISEUR", "GESTIONNAIRE_HADJ", "OPERATEUR_HADJ");

    private final AppUserRepository users;
    private final PasswordResetRepository resets;
    private final LoginOtpRepository loginOtps;
    private final SmtpSettingsRepository smtp;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final MailService mail;
    private final AuditService audit;

    public AuthService(AppUserRepository users, PasswordResetRepository resets, LoginOtpRepository loginOtps,
                       SmtpSettingsRepository smtp, PasswordEncoder encoder, JwtService jwt, MailService mail,
                       AuditService audit) {
        this.users = users;
        this.resets = resets;
        this.loginOtps = loginOtps;
        this.smtp = smtp;
        this.encoder = encoder;
        this.jwt = jwt;
        this.mail = mail;
        this.audit = audit;
    }

    public Map<String, Object> login(String username, String password) {
        AppUser user = users.findByUsername(username).orElse(null);
        if (user == null || !user.isActive() || !encoder.matches(password, user.getPassword())) {
            throw new ApiException(401, "INVALID_CREDENTIALS");
        }

        // 2FA : pour les rôles staff on exige un code OTP envoyé par email. Repli
        // volontaire sur le mot de passe seul si l'OTP ne peut pas être envoyé
        // (SMTP non configuré ou injoignable) afin de ne jamais verrouiller le
        // staff dehors ; l'OTP se réactive dès que le SMTP fonctionne.
        boolean hasEmail = user.getEmail() != null && !user.getEmail().isBlank();
        if (OTP_ROLES.contains(user.getRole()) && hasEmail && mail.isConfigured()) {
            SmtpSettings settings = smtp.findById(1).orElse(null);
            int ttlMinutes = settings != null && settings.getOtpTtlMinutes() != null ? settings.getOtpTtlMinutes() : 10;
            String code = Ids.otp();
            LoginOtp otp = new LoginOtp();
            otp.setUsername(user.getUsername());
            otp.setOtp(code);
            otp.setExpiresAt(System.currentTimeMillis() + (long) ttlMinutes * 60_000);
            otp.setAttempts(0);
            loginOtps.save(otp);

            boolean sent = mail.send(user.getEmail(), "Code de connexion Copilote Hadj",
                    "Votre code de connexion est " + code + ". Il expire dans " + ttlMinutes + " minutes.");
            if (sent) {
                audit.log("OTP_CONNEXION_ENVOYE", user.getUsername(), user.getUsername());
                Map<String, Object> res = new LinkedHashMap<>();
                res.put("otpRequired", true);
                res.put("maskedEmail", maskEmail(user.getEmail()));
                return res;
            }
            // Envoi impossible : on retombe sur le mot de passe seul et on nettoie l'OTP.
            loginOtps.delete(otp);
        }
        return issueToken(user);
    }

    public Map<String, Object> verifyLoginOtp(String username, String otpInput) {
        AppUser user = username == null ? null : users.findByUsername(username.trim()).orElse(null);
        LoginOtp otp = user == null ? null : loginOtps.findById(user.getUsername()).orElse(null);
        if (user == null || otp == null) throw new ApiException(400, "INVALID_OTP");
        if (System.currentTimeMillis() > otp.getExpiresAt()) {
            loginOtps.delete(otp);
            throw new ApiException(400, "OTP_EXPIRED");
        }
        if (otp.getAttempts() >= MAX_OTP_ATTEMPTS) throw new ApiException(400, "TOO_MANY_ATTEMPTS");
        if (!String.valueOf(otpInput).trim().equals(otp.getOtp())) {
            otp.setAttempts(otp.getAttempts() + 1);
            loginOtps.save(otp);
            throw new ApiException(400, "INVALID_OTP");
        }
        loginOtps.delete(otp);
        audit.log("CONNEXION_OTP", user.getUsername(), user.getUsername());
        return issueToken(user);
    }

    private Map<String, Object> issueToken(AppUser user) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", jwt.generate(user.getUsername(), user.getRole(), user.getName()));
        res.put("user", safeUser(user));
        return res;
    }

    public Map<String, Object> requestPasswordReset(String identifier) {
        AppUser user = findByIdentifier(identifier).orElse(null);
        int ttlMinutes = RESET_OTP_TTL_MINUTES;

        // Réponse identique que le compte existe ou non (anti-énumération).
        if (user == null || user.getEmail() == null || !user.isActive()) {
            return Map.of("sent", true, "maskedEmail", (Object) null);
        }

        PasswordReset reset = new PasswordReset();
        reset.setUsername(user.getUsername());
        reset.setOtp(Ids.otp());
        reset.setExpiresAt(System.currentTimeMillis() + (long) ttlMinutes * 60_000);
        reset.setAttempts(0);
        resets.save(reset);

        mail.send(user.getEmail(), "Code de réinitialisation",
                "Votre code de vérification est " + reset.getOtp() + ". Il expire dans " + ttlMinutes + " minutes.");
        audit.log("DEMANDE_REINITIALISATION_MDP", user.getUsername(), user.getUsername());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("sent", true);
        res.put("maskedEmail", maskEmail(user.getEmail()));
        return res;
    }

    public Map<String, Object> resetPassword(String identifier, String otp, String newPassword) {
        AppUser user = findByIdentifier(identifier).orElse(null);
        PasswordReset reset = user == null ? null : resets.findById(user.getUsername()).orElse(null);
        if (user == null || reset == null) throw new ApiException(400, "INVALID_OTP");
        if (System.currentTimeMillis() > reset.getExpiresAt()) {
            resets.delete(reset);
            throw new ApiException(400, "OTP_EXPIRED");
        }
        if (reset.getAttempts() >= MAX_OTP_ATTEMPTS) throw new ApiException(400, "TOO_MANY_ATTEMPTS");
        if (!String.valueOf(otp).trim().equals(reset.getOtp())) {
            reset.setAttempts(reset.getAttempts() + 1);
            resets.save(reset);
            throw new ApiException(400, "INVALID_OTP");
        }
        if (newPassword == null || newPassword.length() < 6) throw new ApiException(400, "WEAK_PASSWORD");

        user.setPassword(encoder.encode(newPassword));
        users.save(user);
        resets.delete(reset);
        audit.log("REINITIALISATION_MDP", user.getUsername(), user.getUsername());
        return Map.of("success", true);
    }

    private Optional<AppUser> findByIdentifier(String identifier) {
        if (identifier == null) return Optional.empty();
        Optional<AppUser> byUsername = users.findByUsername(identifier.trim());
        if (byUsername.isPresent()) return byUsername;
        return users.findByEmailIgnoreCase(identifier.trim());
    }

    public static Map<String, Object> safeUser(AppUser user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("username", user.getUsername());
        m.put("role", user.getRole());
        m.put("name", user.getName());
        m.put("email", user.getEmail());
        m.put("agency", user.getAgency());
        m.put("encadreurId", user.getEncadreurId());
        m.put("active", user.isActive());
        return m;
    }

    private static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}
