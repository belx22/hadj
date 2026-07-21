package cm.afriland.copilotehadj.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${copilote.cors.allowed-origins}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Endpoints publics : authentification, self-service pèlerin, inscription en ligne.
                        // `check-duplicate` est appelé par la page d'inscription publique (avant
                        // toute connexion) : sans cette autorisation, le contrôle de doublon
                        // renvoyait 403 et faisait échouer le formulaire.
                        .requestMatchers(
                                "/auth/**",
                                "/visa/pelerin/login",
                                "/bordereaux/inscription-en-ligne",
                                "/bordereaux/check-duplicate",
                                "/versements",
                                "/versements/groupe",
                                "/versements/beneficiaire/**",
                                // Paiement en ligne (self-service pèlerin) : config, création,
                                // reconfirmation et notification signée du Hub.
                                "/versements/paiement-en-ligne",
                                "/versements/paiement-en-ligne/**",
                                "/encadreurs",
                                "/saisons",
                                "/parametrage/prix-officiel"
                        ).permitAll()
                        // Espace pèlerin-encadreur : un encadreur de type pèlerin gère son groupe
                        // sans compte staff (identifié par sa session pèlerin, pas par un JWT). Ces
                        // actions relèvent du self-service pèlerin, au même titre que l'inscription
                        // en ligne et les versements déjà publics : consultation du groupe,
                        // inscription (unité + import), versements groupés et dépôt des passeports
                        // de son propre groupe (le service vérifie que chaque dossier lui appartient).
                        // Le changement de statut visa reste réservé au staff.
                        .requestMatchers(HttpMethod.GET, "/visa/encadreur/*/groupe").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/visa/encadreur/inscription",
                                "/visa/encadreur/*/import",
                                "/visa/encadreur/*/import-versement-groupe"
                        ).permitAll()
                        .requestMatchers(HttpMethod.PUT, "/visa/encadreur/*/depots-passeports").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/**").permitAll()
                        // Tout le reste exige un jeton valide.
                        .anyRequest().authenticated()
                )
                // Un accès anonyme (aucun jeton, ou jeton expiré — JwtAuthFilter le traite
                // comme anonyme) à une route protégée doit renvoyer 401, et non le 403 que
                // Spring émet par défaut. Sans cela, une session expirée laissait l'interface
                // « connectée » mais chaque action renvoyait « Erreur » (403) sans jamais
                // ramener à l'écran de connexion. Le 401 déclenche le SessionWatcher du front.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (request, response, authEx) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "UNAUTHENTICATED")
                ))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
