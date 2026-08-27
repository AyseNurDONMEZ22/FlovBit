package com.example.demo.security;

import java.io.IOException;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    // Dışarıdan FRONTEND_URL ortam değişkenini alıyoruz, bulamazsa localhost:3000 yapıyoruz.
    @Value("${FRONTEND_URL:http://localhost:3000}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // Google/GitHub'dan gelen e-posta ve isim bilgilerini al
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        
        // GitHub bazen emaili gizli tutar, name veya login kullanır. Olası hataları önleyelim:
        if (email == null) {
            email = oAuth2User.getAttribute("login") + "@github.com"; 
            name = oAuth2User.getAttribute("login");
        }

        // 1. Veritabanında bu kullanıcı var mı kontrol et
        Optional<User> userOptional = userRepository.findByEmail(email);
        User user;

        if (userOptional.isEmpty()) {
            // 2. Kullanıcı yoksa YENİ KAYIT oluştur (İşte veri tabanına düştüğü an!)
            user = new User();
            user.setEmail(email);
            // İsimdeki boşlukları silip küçük harfe çevirerek kullanıcı adı yapalım
            user.setUsername(name != null ? name.replaceAll("\\s+", "").toLowerCase() : "user_" + System.currentTimeMillis());
            user.setProvider("OAUTH2"); // Şifre boş kalıyor çünkü şifresi Google'da
            userRepository.save(user);
        } else {
            // Kullanıcı zaten varsa mevcut kullanıcıyı al
            user = userOptional.get();
        }

        // 3. Bizim sisteme özel JWT Bileti (Token) üret
        String token = jwtUtil.generateToken(user.getEmail());

        // 4. Bilet ve e-postayı URL'ye ekleyip Dinamik Frontend Adresine Işınla!
        String redirectUrl = frontendUrl + "/dashboard?token=" + token + "&email=" + user.getEmail();
        response.sendRedirect(redirectUrl);
    }
}