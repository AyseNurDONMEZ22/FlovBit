package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.User;
import com.example.demo.entity.Workspace;
import com.example.demo.entity.WorkspaceMember;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WorkspaceMemberRepository;
import com.example.demo.repository.WorkspaceRepository;

@RestController
@RequestMapping("/api/v1/workspaces")
@CrossOrigin(origins = "*") // Next.js'e kapıları açıyoruz
public class WorkspaceController {

    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository; // Üyeler için eklendi

    @Autowired
    public WorkspaceController(WorkspaceRepository workspaceRepository, UserRepository userRepository, WorkspaceMemberRepository workspaceMemberRepository) {
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
    }

    // Yeni Workspace Oluşturma Kapısı (SENİN KODUN KORUNDU, SADECE ÜYE EKLEME EKLENDİ)
    @PostMapping("/create")
    public ResponseEntity<?> createWorkspace(@RequestBody Map<String, Object> request) {
        try {
            String name = (String) request.get("name");
            String email = (String) request.get("email"); 

            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı!"));

            Workspace newWorkspace = new Workspace();
            newWorkspace.setName(name);
            newWorkspace.setUser(user);

            Workspace savedWorkspace = workspaceRepository.save(newWorkspace);

            // GÜNCELLEME BURADA: Kurucuyu otomatik Admin olarak üyelere ekliyoruz
            WorkspaceMember owner = new WorkspaceMember();
            owner.setWorkspaceId(savedWorkspace.getId());
            owner.setUserEmail(email);
            owner.setRole("ADMIN");
            workspaceMemberRepository.save(owner);

            return ResponseEntity.ok(savedWorkspace);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Kullanıcının Workspace'lerini Listeleme Kapısı (TAMAMEN DİNAMİKLEŞTİRİLDİ)
    @GetMapping("/user/{email}")
    public ResponseEntity<?> getUserWorkspaces(@PathVariable String email) {
        try {
            // 1. Kullanıcının e-postasıyla ekli olduğu tüm üyelikleri bul
            List<WorkspaceMember> memberships = workspaceMemberRepository.findByUserEmail(email);
            
            // 2. Eğer hiç üyeliği yoksa boş liste dön
            if (memberships.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            // 3. Üye olduğu workspace'lerin ID'lerini çıkar
            List<Long> workspaceIds = memberships.stream()
                    .map(WorkspaceMember::getWorkspaceId)
                    .collect(Collectors.toList());

            // 4. O ID'lere ait tüm workspace'leri getir
            List<Workspace> workspaces = workspaceRepository.findAllById(workspaceIds);
            
            return ResponseEntity.ok(workspaces);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}