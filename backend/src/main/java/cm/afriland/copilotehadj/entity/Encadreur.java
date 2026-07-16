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

    private String firstName;
    private String lastName;
    // Nom complet dérivé (prénom + nom), conservé pour l'affichage dans les listes
    // déroulantes et les rapports qui référencent l'encadreur par son nom.
    private String name;
    private String phone;
    private String region;

    // Numéro de passeport de l'encadreur (même pièce que le pèlerin). Sert à le
    // reconnaître lors de son auto-inscription en ligne.
    private String idNumber;

    @Column(unique = true)
    private String code; // code alphanumérique 3 caractères

    @Column(nullable = false)
    private boolean active = true;
}
