package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.WorkspaceMember;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WorkspaceMemberRepository;

@RestController
@RequestMapping("/api/v1/workspaces/members")
@CrossOrigin(origins = "*")
public class WorkspaceMemberController {

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    @Autowired
    private UserRepository userRepository;

    // Belirli bir Workspace'in üyelerini listele
    @GetMapping("/{workspaceId}")
    public List<WorkspaceMember> getMembers(@PathVariable Long workspaceId) {
        return memberRepository.findByWorkspaceId(workspaceId);
    }

    // Workspace'e yeni üye ekle
    @PostMapping("/{workspaceId}/add")
    public ResponseEntity<?> addMember(@PathVariable Long workspaceId, @RequestBody WorkspaceMember member) {
        // 1. KONTROL: Veritabanında böyle bir e-posta var mı?
        if (userRepository.findByEmail(member.getUserEmail()).isEmpty()) {
            return ResponseEntity.badRequest().body("Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı!");
        }

        // 2. KONTROL: Kullanıcı zaten bu çalışma alanında var mı?
        if (memberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, member.getUserEmail())) {
            return ResponseEntity.badRequest().body("Bu kullanıcı zaten çalışma alanına ekli.");
        }

        member.setWorkspaceId(workspaceId);
        if (member.getRole() == null || member.getRole().isEmpty()) {
            member.setRole("MEMBER"); // İleride VIEWER, EDITOR vb. eklenecek
        }
        return ResponseEntity.ok(memberRepository.save(member));
    }

    // Üye Çıkarma (Silme) İşlemi
    @DeleteMapping("/{workspaceId}/remove/{email}")
    public ResponseEntity<?> removeMember(@PathVariable Long workspaceId, @PathVariable String email) {
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

    // Üye Rolünü Güncelleme İşlemi
    @PutMapping("/{workspaceId}/update-role/{email}")
    public ResponseEntity<?> updateRole(@PathVariable Long workspaceId, @PathVariable String email, @RequestBody java.util.Map<String, String> body) {
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