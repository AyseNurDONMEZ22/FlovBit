package com.example.demo.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Issue;
import com.example.demo.entity.Project;
import com.example.demo.repository.IssueRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.WorkspaceMemberRepository;

@RestController
@RequestMapping("/api/v1/boards")
@CrossOrigin(origins = "*")
public class BoardController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    // ProjectController'daki ile aynı yetki kontrolü mantığı
    private boolean isUserAllowedInWorkspace(Long workspaceId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return memberRepository.findByWorkspaceId(workspaceId).stream()
                .anyMatch(m -> m.getUserEmail().equals(currentUserEmail) && "ACCEPTED".equals(m.getStatus()));
    }

    // Bir projenin board görünümü: issue'lar status'e göre gruplu döner
    // { "To Do": [...], "In Progress": [...], "in review": [...], "Done": [...] }
    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getBoardByProject(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        if (!isUserAllowedInWorkspace(project.getWorkspaceId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bu projenin board'unu görme yetkiniz yok.");
        }

        List<Issue> issues = issueRepository.findByProjectId(projectId);

        // Sabit sütun sırası + içinde veri olan başka statüler varsa sona eklenir
        List<String> columnOrder = List.of("To Do", "In Progress", "in review", "Done");
        Map<String, List<Issue>> board = new LinkedHashMap<>();
        for (String col : columnOrder) {
            board.put(col, issues.stream().filter(i -> col.equals(i.getStatus())).collect(Collectors.toList()));
        }
        // columnOrder'da olmayan statüler varsa (elle girilmiş farklı bir status) onları da ekle
        issues.stream()
                .map(Issue::getStatus)
                .distinct()
                .filter(s -> s != null && !columnOrder.contains(s))
                .forEach(s -> board.put(s, issues.stream().filter(i -> s.equals(i.getStatus())).collect(Collectors.toList())));

        return ResponseEntity.ok(board);
    }
}