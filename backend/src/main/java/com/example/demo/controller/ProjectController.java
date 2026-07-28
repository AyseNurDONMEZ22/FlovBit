package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

@RestController
@RequestMapping("/api/v1/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    @Autowired
    private ProjectRepository projectRepository;

    // Workspace'e ait projeleri getir
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<Project>> getProjectsByWorkspace(@PathVariable Long workspaceId) {
        return ResponseEntity.ok(projectRepository.findByWorkspaceId(workspaceId));
    }

    // TEK BİR PROJE GETİR (Settings sayfasındaki Failed to fetch hatasının çözümü)
    @GetMapping("/{id}")
    public ResponseEntity<?> getProjectById(@PathVariable Long id) {
        return projectRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Yeni proje oluştur
    @PostMapping("/create")
    public ResponseEntity<Project> createProject(@RequestBody Project project) {
        // Eğer kısa isim (Key) girilmemişse, ismin ilk 3 harfinden otomatik oluştur
        if (project.getProjectKey() == null || project.getProjectKey().isEmpty()) {
            String key = project.getName().length() >= 3 
                ? project.getName().substring(0, 3).toUpperCase() 
                : project.getName().toUpperCase();
            project.setProjectKey(key);
        }
        return ResponseEntity.ok(projectRepository.save(project));
    }

    // Proje Silme (Settings sayfasındaki Danger Zone için)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id) {
        projectRepository.deleteById(id);
        return ResponseEntity.ok().body("{\"message\": \"Proje başarıyla silindi.\"}");
    }
}