package cm.afriland.copilotehadj.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "encadreur")
public class Encadreur {
    @Id
    private String id;

    private String name;
    private String region;

    // Numéro de pièce d'identité de l'encadreur (distinct du passeport du pèlerin).
    // Sert à le reconnaître lors de son auto-inscription en ligne.
    private String idNumber;

    @Column(unique = true)
    private String code; // code alphanumérique 3 caractères

    @Column(nullable = false)
    private boolean active = true;
}
