package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Project;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.WorkspaceMemberRepository;

@RestController
@RequestMapping("/api/v1/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    // YARDIMCI METOT: Kullanıcı bu projeyi/workspace'i görmeye yetkili mi?
    private boolean isUserAllowedInWorkspace(Long workspaceId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return memberRepository.findByWorkspaceId(workspaceId).stream()
                .anyMatch(m -> m.getUserEmail().equals(currentUserEmail) && "ACCEPTED".equals(m.getStatus()));
    }

    // Workspace'e ait projeleri getir
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<?> getProjectsByWorkspace(@PathVariable Long workspaceId) {
        if (!isUserAllowedInWorkspace(workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu çalışma alanındaki projeleri görme yetkiniz yok.");
        }
        return ResponseEntity.ok(projectRepository.findByWorkspaceId(workspaceId));
    }

    // TEK BİR PROJE GETİR
    @GetMapping("/{id}")
    public ResponseEntity<?> getProjectById(@PathVariable Long id) {
        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (!isUserAllowedInWorkspace(project.getWorkspaceId())) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu projeyi görme yetkiniz yok.");
        }
        return ResponseEntity.ok(project);
    }

    // Yeni proje oluştur
    @PostMapping("/create")
    public ResponseEntity<?> createProject(@RequestBody Project project) {
        if (!isUserAllowedInWorkspace(project.getWorkspaceId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu çalışma alanında proje oluşturma yetkiniz yok.");
        }

        if (project.getProjectKey() == null || project.getProjectKey().isEmpty()) {
            String key = project.getName().length() >= 3 
                ? project.getName().substring(0, 3).toUpperCase() 
                : project.getName().toUpperCase();
            project.setProjectKey(key);
        }
        return ResponseEntity.ok(projectRepository.save(project));
    }

    // Proje Silme
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id) {
        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }

        if (!isUserAllowedInWorkspace(project.getWorkspaceId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu projeyi silme yetkiniz yok.");
        }

        projectRepository.deleteById(id);
        return ResponseEntity.ok().body("{\"message\": \"Proje başarıyla silindi.\"}");
    }
}