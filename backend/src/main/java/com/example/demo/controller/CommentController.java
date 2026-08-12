package com.example.demo.controller;

import java.time.LocalDateTime;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Comment;
import com.example.demo.repository.CommentRepository;

@RestController
@RequestMapping("/api/v1/comments")
@CrossOrigin(origins = "*")
public class CommentController {

    @Autowired
    private CommentRepository commentRepository;

    private String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // Yorum ekle — authorEmail body'den DEĞİL, JWT'den alınır (kimse başkası adına yorum yazamaz)
    @PostMapping("/create")
    public ResponseEntity<?> createComment(@RequestBody Map<String, Object> body) {
        Long issueId = ((Number) body.get("issueId")).longValue();
        String content = (String) body.get("content");

        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Yorum içeriği boş olamaz.");
        }

        Comment comment = new Comment();
        comment.setIssueId(issueId);
        comment.setAuthorEmail(currentUserEmail());
        comment.setContent(content);
        comment.setCreatedAt(LocalDateTime.now());

        return ResponseEntity.ok(commentRepository.save(comment));
    }

    // Bir issue'nun tüm yorumlarını getir (eskiden yeniye sıralı)
    @GetMapping("/issue/{issueId}")
    public ResponseEntity<List<Comment>> getCommentsByIssue(@PathVariable Long issueId) {
        return ResponseEntity.ok(commentRepository.findByIssueIdOrderByCreatedAtAsc(issueId));
    }

    // Kendi yorumunu sil
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteComment(@PathVariable Long id) {
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) {
            return ResponseEntity.notFound().build();
        }
        if (!comment.getAuthorEmail().equals(currentUserEmail())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sadece kendi yorumunu silebilirsin.");
        }
        commentRepository.delete(comment);
        return ResponseEntity.ok().body("{\"message\": \"Yorum silindi.\"}");
    }
}