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

    @Column(unique = true)
    private String code; // code alphanumérique 3 caractères

    @Column(nullable = false)
    private boolean active = true;
}
