package com.example.demo.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.demo.entity.ApiKey;
import com.example.demo.repository.ApiKeyRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    // YENİ: API key doğrulaması için repository
    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // "Bearer " ile başlayan bir bilet (Token) var mı?
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            // YENİ: "fb_" önekliyse bu bir API Key'dir, JWT değil — ayrı yoldan doğrula
            if (token.startsWith("fb_")) {
                Optional<ApiKey> keyOpt = apiKeyRepository.findByKeyHash(sha256Hex(token));
                boolean valid = keyOpt.isPresent()
                        && !keyOpt.get().isRevoked()
                        && (keyOpt.get().getExpiresAt() == null || keyOpt.get().getExpiresAt().isAfter(LocalDateTime.now()));

                if (valid) {
                    ApiKey apiKey = keyOpt.get();
                    apiKey.setLastUsedAt(LocalDateTime.now());
                    apiKeyRepository.save(apiKey);

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(apiKey.getUserEmail(), null, new ArrayList<>());
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }

            // MEVCUT MANTIK — hiç değişmedi
            } else if (jwtUtil.validateToken(token)) {

                // 1. Biletin içinden e-postayı çıkar
                String email = jwtUtil.extractEmail(token);

                // 2. Bu kişiye resmi bir "Güvenli Geçiş" damgası (Authentication) oluştur
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(email, null, new ArrayList<>());

                // 3. Damgayı sisteme vur (Spring Security artık bu isteğe izin verecek)
                SecurityContextHolder.getContext().setAuthentication(authToken);

            } else {
                // Bilet geçersizse veya süresi dolmuşsa 401 Unauthorized (Yetkisiz) hatası dön
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        // Filtreden başarıyla geçenleri yoluna devam ettir
        filterChain.doFilter(request, response);
    }

    // YENİ: API key'i veritabanında saklamadan önce/ararken hash'lemek için (SHA-256)
    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}