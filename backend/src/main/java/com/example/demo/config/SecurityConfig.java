package com.example.demo.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.demo.security.JwtFilter;
import com.example.demo.security.OAuth2SuccessHandler;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Dışarıdan FRONTEND_URL ortam değişkenini alıyoruz, bulamazsa localhost:3000 yapıyoruz.
    @Value("${FRONTEND_URL:http://localhost:3000}")
    private String frontendUrl;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Güvenlik görevlimizi (Bilet kontrolcüsü) içeri alıyoruz
    @Autowired
    private JwtFilter jwtFilter; 

    // Google/GitHub başarılı giriş yöneticimizi içeri alıyoruz
    @Autowired
    private OAuth2SuccessHandler oAuth2SuccessHandler; 

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Dinamik Frontend isteklerine kapıyı açıyoruz
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 2. Form güvenliğini (CSRF) şimdilik devredışı bırakıyoruz ki API'miz rahat çalışsın
            .csrf(csrf -> csrf.disable()) 
            
            // 3. İzinler ve Kapılar
            .authorizeHttpRequests(auth -> auth
                // Tarayıcının ön kontrol (OPTIONS) isteklerine biletsiz izin ver
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() 
                
                // Kayıt ve giriş işlemlerine şifresiz izin veriyoruz
                .requestMatchers("/api/v1/auth/**", "/api/v1/users/register").permitAll() 
                
                // Geri kalan HER ŞEY için bilet şart!
                .anyRequest().authenticated()
            )
            
            // Bilet kontrolcümüzü (JwtFilter) resmi olarak sisteme dahil ediyoruz
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)

            // 4. Google ve GitHub ile girişi aktif ediyoruz
            .oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2SuccessHandler)
            );
        
        return http.build();
    }

    // CORS (Çapraz Kaynak) İzin Ayarları
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Hem canlı Railway adresine hem de yerel testler için localhost'a izin veriyoruz
        configuration.setAllowedOrigins(Arrays.asList(frontendUrl, "http://localhost:3000"));
        
        // Tüm HTTP metotlarına (POST, GET, OPTIONS vb.) kapıyı açıyoruz
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*")); 
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}