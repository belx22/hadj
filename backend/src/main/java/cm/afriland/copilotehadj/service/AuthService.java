package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.config.JwtService;
import cm.afriland.copilotehadj.entity.AppUser;
import cm.afriland.copilotehadj.entity.PasswordReset;
import cm.afriland.copilotehadj.entity.SmtpSettings;
import cm.afriland.copilotehadj.repository.AppUserRepository;
import cm.afriland.copilotehadj.repository.PasswordResetRepository;
import cm.afriland.copilotehadj.repository.SmtpSettingsRepository;
import cm.afriland.copilotehadj.web.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private static final int MAX_OTP_ATTEMPTS = 5;

    private final AppUserRepository users;
    private final PasswordResetRepository resets;
    private final SmtpSettingsRepository smtp;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final NotificationService notifications;
    private final AuditService audit;

    public AuthService(AppUserRepository users, PasswordResetRepository resets, SmtpSettingsRepository smtp,
                       PasswordEncoder encoder, JwtService jwt, NotificationService notifications, AuditService audit) {
        this.users = users;
        this.resets = resets;
        this.smtp = smtp;
        this.encoder = encoder;
        this.jwt = jwt;
        this.notifications = notifications;
        this.audit = audit;
    }

    public Map<String, Object> login(String username, String password) {
        AppUser user = users.findByUsername(username).orElse(null);
        if (user == null || !user.isActive() || !encoder.matches(password, user.getPassword())) {
            throw new ApiException(401, "INVALID_CREDENTIALS");
        }
        Map<String, Object> safe = safeUser(user);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", jwt.generate(user.getUsername(), user.getRole(), user.getName()));
        res.put("user", safe);
        return res;
    }

    public Map<String, Object> requestPasswordReset(String identifier) {
        AppUser user = findByIdentifier(identifier).orElse(null);
        SmtpSettings settings = smtp.findById(1).orElse(null);
        int ttlMinutes = settings != null && settings.getOtpTtlMinutes() != null ? settings.getOtpTtlMinutes() : 10;

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

        notifications.sendEmail(user.getEmail(), "Code de réinitialisation",
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
