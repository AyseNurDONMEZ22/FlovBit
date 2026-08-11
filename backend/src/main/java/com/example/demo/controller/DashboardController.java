package com.example.demo.controller;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Issue;
import com.example.demo.entity.Project;
import com.example.demo.repository.IssueRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.WorkspaceMemberRepository;

@RestController
@RequestMapping("/api/v1/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    private boolean isUserAllowedInWorkspace(Long workspaceId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return memberRepository.findByWorkspaceId(workspaceId).stream()
                .anyMatch(m -> m.getUserEmail().equals(currentUserEmail) && "ACCEPTED".equals(m.getStatus()));
    }

    // Proje bazlı özet istatistik: toplam, statüye göre ve önceliğe göre dağılım
    @GetMapping("/stats")
    public ResponseEntity<?> getProjectStats(@RequestParam Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        if (!isUserAllowedInWorkspace(project.getWorkspaceId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu projenin istatistiklerini görme yetkiniz yok.");
        }

        List<Issue> issues = issueRepository.findByProjectId(projectId);

        Map<String, Long> byStatus = issues.stream()
                .collect(Collectors.groupingBy(i -> i.getStatus() == null ? "Unknown" : i.getStatus(), Collectors.counting()));
        Map<String, Long> byPriority = issues.stream()
                .collect(Collectors.groupingBy(i -> i.getPriority() == null ? "Unknown" : i.getPriority(), Collectors.counting()));

        Map<String, Object> result = new HashMap<>();
        result.put("projectId", projectId);
        result.put("totalIssues", issues.size());
        result.put("byStatus", byStatus);
        result.put("byPriority", byPriority);
        result.put("doneCount", byStatus.getOrDefault("Done", 0L));

        return ResponseEntity.ok(result);
    }

    // Workspace bazlı son aktivite: tüm projelerdeki en yeni issue'lar (oluşturulma zamanına göre)
    // NOT: Ayrı bir "activity log" tablosu yok; en pratik ve güvenilir yaklaşım olarak
    // issue createdAt alanını kullanıyoruz. İleride gerçek bir audit-log tablosu eklenirse
    // (kim neyi ne zaman yaptı) bu endpoint ona yönlendirilebilir.
    @GetMapping("/activity")
    public ResponseEntity<?> getWorkspaceActivity(@RequestParam Long workspaceId) {
        if (!isUserAllowedInWorkspace(workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu çalışma alanının aktivitesini görme yetkiniz yok.");
        }

        List<Long> projectIds = projectRepository.findByWorkspaceId(workspaceId).stream()
                .map(Project::getId)
                .collect(Collectors.toList());

        if (projectIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Issue> recentIssues = issueRepository.findByProjectIdIn(projectIds).stream()
                .sorted(Comparator.comparing(Issue::getCreatedAt).reversed())
                .limit(20)
                .collect(Collectors.toList());

        return ResponseEntity.ok(recentIssues);
    }
}