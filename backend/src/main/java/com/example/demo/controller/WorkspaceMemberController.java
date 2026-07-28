package com.example.demo.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import com.example.demo.entity.Workspace;
import com.example.demo.entity.WorkspaceMember;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WorkspaceMemberRepository;
import com.example.demo.repository.WorkspaceRepository;

@RestController
@RequestMapping("/api/v1/workspaces/members")
@CrossOrigin(origins = "*")
public class WorkspaceMemberController {

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    @Autowired
    private UserRepository userRepository;

    // BİLDİRİM VE WORKSPACE İÇİN EKLENEN REPOSITORY'LER
    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    // YARDIMCI METOT: İsteği yapan kullanıcının o çalışma alanında "ADMIN" olup olmadığını kontrol eder
    private boolean isCurrentUserAdmin(Long workspaceId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return memberRepository.findByWorkspaceId(workspaceId).stream()
                .anyMatch(m -> m.getUserEmail().equals(currentUserEmail) && "ADMIN".equals(m.getRole()) && "ACCEPTED".equals(m.getStatus()));
    }

    // YARDIMCI METOT: İsteği yapan kullanıcının o çalışma alanında "Kabul Etmiş" bir üye olup olmadığını kontrol eder
    private boolean isCurrentUserMember(Long workspaceId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return memberRepository.findByWorkspaceId(workspaceId).stream()
                .anyMatch(m -> m.getUserEmail().equals(currentUserEmail) && "ACCEPTED".equals(m.getStatus()));
    }

    // Belirli bir Workspace'in SADECE KABUL ETMİŞ üyelerini listele
    @GetMapping("/{workspaceId}")
    public ResponseEntity<?> getMembers(@PathVariable Long workspaceId) {
        if (!isCurrentUserMember(workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu çalışma alanını görüntüleme yetkiniz yok.");
        }
        
        List<WorkspaceMember> activeMembers = memberRepository.findByWorkspaceId(workspaceId)
                .stream().filter(m -> "ACCEPTED".equals(m.getStatus())).toList();
                
        return ResponseEntity.ok(activeMembers);
    }

    // Workspace'e yeni üye davet et ve BİLDİRİM GÖNDER
    @PostMapping("/{workspaceId}/add")
    public ResponseEntity<?> addMember(@PathVariable Long workspaceId, @RequestBody WorkspaceMember member) {
        // Sadece Adminler davet gönderebilir
        if (!isCurrentUserAdmin(workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sadece adminler yeni üye davet edebilir.");
        }

        // 1. Kullanıcı veritabanında var mı?
        User targetUser = userRepository.findByEmail(member.getUserEmail()).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.badRequest().body("Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı!");
        }

        // 2. Kullanıcı zaten ekli mi veya davet edilmiş mi?
        if (memberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, member.getUserEmail())) {
            return ResponseEntity.badRequest().body("Bu kullanıcı zaten davet edilmiş veya çalışma alanına ekli.");
        }

        member.setWorkspaceId(workspaceId);
        member.setStatus("PENDING"); // Davet beklemede olarak kaydedilir
        if (member.getRole() == null || member.getRole().isEmpty()) {
            member.setRole("MEMBER");
        }
        
        WorkspaceMember savedMember = memberRepository.save(member);

        // 3. DAVET EDİLEN KULLANICIYA BİLDİRİM OLUŞTURMA
        try {
            String adminEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
            String workspaceName = workspace != null ? workspace.getName() : "Çalışma Alanı";

            Notification notification = new Notification();
            notification.setUser(targetUser); // Entity'deki User ilişkisi bağlandı
            notification.setTitle("Yeni Çalışma Alanı Daveti");
            notification.setMessage(adminEmail + " sizi \"" + workspaceName + "\" çalışma alanına davet etti.");
            notification.setRead(false);
            
            notificationRepository.save(notification);
        } catch (Exception e) {
            System.err.println("Bildirim kaydedilemedi: " + e.getMessage());
        }

        return ResponseEntity.ok(savedMember);
    }

    // Daveti Kabul Etme (Kullanıcı kendi davetini onaylar)
    @PutMapping("/{workspaceId}/accept-invite")
    public ResponseEntity<?> acceptInvite(@PathVariable Long workspaceId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        
        List<WorkspaceMember> members = memberRepository.findByWorkspaceId(workspaceId);
        WorkspaceMember pendingMember = members.stream()
                .filter(m -> m.getUserEmail().equals(currentUserEmail) && "PENDING".equals(m.getStatus()))
                .findFirst().orElse(null);

        if (pendingMember != null) {
            pendingMember.setStatus("ACCEPTED");
            return ResponseEntity.ok(memberRepository.save(pendingMember));
        }
        return ResponseEntity.badRequest().body("Geçerli bir davet bulunamadı.");
    }

    // Üye Çıkarma (Silme) İşlemi - SADECE ADMIN YAPABİLİR
    @DeleteMapping("/{workspaceId}/remove/{email}")
    public ResponseEntity<?> removeMember(@PathVariable Long workspaceId, @PathVariable String email) {
        if (!isCurrentUserAdmin(workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sadece adminler üye çıkarabilir.");
        }

        List<WorkspaceMember> members = memberRepository.findByWorkspaceId(workspaceId);
        WorkspaceMember memberToRemove = members.stream()
                .filter(m -> m.getUserEmail().equals(email))
                .findFirst()
                .orElse(null);

        if (memberToRemove != null) {
            memberRepository.delete(memberToRemove);
            return ResponseEntity.ok().body("{\"message\": \"Üye başarıyla çıkarıldı.\"}");
        }
        return ResponseEntity.badRequest().body("Üye bulunamadı.");
    }

    // Üye Rolünü Güncelleme İşlemi - SADECE ADMIN YAPABİLİR
    @PutMapping("/{workspaceId}/update-role/{email}")
    public ResponseEntity<?> updateRole(@PathVariable Long workspaceId, @PathVariable String email, @RequestBody Map<String, String> body) {
        if (!isCurrentUserAdmin(workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Rolleri sadece adminler değiştirebilir.");
        }

        // Kendi yetkisini düşürmesini engelle
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (currentUserEmail.equals(email) && !"ADMIN".equals(body.get("role"))) {
            return ResponseEntity.badRequest().body("Kendi admin yetkinizi kaldıramazsınız.");
        }

        List<WorkspaceMember> members = memberRepository.findByWorkspaceId(workspaceId);
        WorkspaceMember memberToUpdate = members.stream()
                .filter(m -> m.getUserEmail().equals(email))
                .findFirst()
                .orElse(null);

        if (memberToUpdate != null) {
            memberToUpdate.setRole(body.get("role"));
            return ResponseEntity.ok(memberRepository.save(memberToUpdate));
        }
        return ResponseEntity.badRequest().body("Üye bulunamadı.");
    }
}