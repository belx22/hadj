package cm.afriland.copilotehadj.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "password_reset")
public class PasswordReset {
    @Id
    private String username;

    private String otp;
    private Long expiresAt; // epoch millis
    private Integer attempts = 0;
}
