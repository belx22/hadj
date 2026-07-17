package cm.afriland.copilotehadj.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Code OTP à usage unique pour la connexion à deux facteurs du staff.
 * Clé = nom d'utilisateur : une seule demande active par compte (une nouvelle
 * connexion écrase la précédente). Distinct de {@link PasswordReset} pour ne pas
 * mélanger les deux usages sur la même ligne.
 */
@Getter
@Setter
@Entity
@Table(name = "login_otp")
public class LoginOtp {
    @Id
    private String username;

    private String otp;
    private Long expiresAt; // epoch millis
    private Integer attempts = 0;
}
