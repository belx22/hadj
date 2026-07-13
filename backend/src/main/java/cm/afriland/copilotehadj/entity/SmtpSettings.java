package cm.afriland.copilotehadj.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "smtp_settings")
public class SmtpSettings {
    @Id
    private Integer id = 1; // singleton

    private String host;
    private Integer port;
    private String username;
    private String password;
    private String fromName;
    private String fromEmail;
    private boolean useTls = true;
    private Integer otpTtlMinutes = 10;
}
