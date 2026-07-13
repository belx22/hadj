package cm.afriland.copilotehadj.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "app_user")
public class AppUser {
    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password; // encodé BCrypt

    @Column(nullable = false)
    private String role; // SUPERVISEUR, GESTIONNAIRE_HADJ, OPERATEUR_HADJ, ENCADREUR, ADMIN_DSI

    private String name;
    private String email;
    private String agency;
    private String encadreurId;

    @Column(nullable = false)
    private boolean active = true;
}
