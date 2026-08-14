package com.example.demo.service;

import com.example.demo.dto.request.FileRequest;
import com.example.demo.dto.response.FileResponse;
import com.example.demo.entity.FileEntity;
import com.example.demo.entity.User;
import com.example.demo.repository.FileRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.FileShareTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final FileShareTokenUtil fileShareTokenUtil;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${app.public-base-url}")
    private String publicBaseUrl;

    // 파일 목록 조회
    @Transactional(readOnly = true)
    public List<FileResponse> getFiles(String userId, String parentId, Boolean isFavorite, String search) {
        List<FileEntity> files;

        if (search != null && !search.isEmpty()) {
            files = fileRepository.findByUserIdAndNameContaining(userId, search);
        } else if (Boolean.TRUE.equals(isFavorite)) {
            files = fileRepository.findByUserIdAndIsFavoriteTrue(userId);
        } else if (parentId != null) {
            files = fileRepository.findByUserIdAndParentId(userId, parentId);
        } else {
            files = fileRepository.findByUserIdAndParentIsNull(userId);
        }

        return files.stream().map(FileResponse::new).toList();
    }

    // 파일 업로드 (업로드된 파일들의 메타데이터 반환 - id로 나중에 공개 링크 생성 등에 사용)
    @Transactional
    public List<FileResponse> uploadFiles(String userId, MultipartFile[] files, String parentId) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        FileEntity parent = null;
        if (parentId != null) {
            parent = fileRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("폴더를 찾을 수 없습니다."));
        }

        // 유저별 업로드 디렉토리 생성
        Path userDir = Paths.get(uploadDir, userId);
        Files.createDirectories(userDir);

        List<FileResponse> uploaded = new java.util.ArrayList<>();

        for (MultipartFile file : files) {
            String originalName = file.getOriginalFilename();
            String extension = getExtension(originalName);
            String storedName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);
            Path targetPath = userDir.resolve(storedName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            FileEntity fileEntity = new FileEntity();
            fileEntity.setUser(user);
            fileEntity.setParent(parent);
            fileEntity.setName(originalName);
            fileEntity.setStoragePath(targetPath.toString());
            fileEntity.setIsDirectory(false);
            fileEntity.setSizeBytes(file.getSize());
            fileEntity.setMimeType(file.getContentType());
            fileEntity.setExtension(extension.isEmpty() ? null : extension);
            fileEntity.setIsFavorite(false);

            fileRepository.save(fileEntity);
            uploaded.add(new FileResponse(fileEntity));
        }

        return uploaded;
    }

    // 폴더 생성
    @Transactional
    public void createDirectory(String userId, FileRequest.CreateDirectory request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        FileEntity parent = null;
        if (request.getParentId() != null) {
            parent = fileRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("폴더를 찾을 수 없습니다."));
        }

        FileEntity directory = new FileEntity();
        directory.setUser(user);
        directory.setParent(parent);
        directory.setName(request.getName());
        directory.setIsDirectory(true);
        directory.setIsFavorite(false);

        fileRepository.save(directory);
    }

    // 파일/폴더 이름 변경
    @Transactional
    public void rename(String userId, String fileId, FileRequest.Rename request) {
        FileEntity file = findFile(userId, fileId);
        file.setName(request.getName());
        fileRepository.save(file);
    }

    // 즐겨찾기 토글
    @Transactional
    public void toggleFavorite(String userId, String fileId) {
        FileEntity file = findFile(userId, fileId);
        file.setIsFavorite(!file.getIsFavorite());
        fileRepository.save(file);
    }

    // 파일 다운로드 (항상 첨부파일로 - 브라우저가 열지 않고 저장하도록)
    @Transactional(readOnly = true)
    public ShareableFile downloadFile(String userId, String fileId) throws MalformedURLException {
        FileEntity file = findFile(userId, fileId);

        if (file.getIsDirectory()) {
            throw new RuntimeException("폴더는 다운로드할 수 없습니다.");
        }

        Path filePath = Paths.get(file.getStoragePath());
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            throw new RuntimeException("파일을 찾을 수 없습니다.");
        }

        return new ShareableFile(resource, file.getMimeType(), file.getName());
    }

    // 브라우저에서 바로 보여줄 미리보기 파일 조회 (이미지/영상/PDF만 허용, 그 외는 다운로드로만 받을 수 있음)
    @Transactional(readOnly = true)
    public ShareableFile getPreviewFile(String userId, String fileId) throws MalformedURLException {
        FileEntity file = findFile(userId, fileId);

        if (file.getIsDirectory()) {
            throw new RuntimeException("폴더는 미리볼 수 없습니다.");
        }
        if (!FileEntity.isPreviewable(file.getMimeType())) {
            throw new RuntimeException("미리보기를 지원하지 않는 파일 형식입니다.");
        }

        Path filePath = Paths.get(file.getStoragePath());
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            throw new RuntimeException("파일을 찾을 수 없습니다.");
        }

        return new ShareableFile(resource, file.getMimeType(), file.getName());
    }

    // 카카오 등 외부 서비스에 잠깐(15분) 공개할 다운로드 링크 생성. 소유권은 여기서 한 번만 확인하고,
    // 이후엔 서명된 토큰 자체가 접근 권한 역할을 한다 (배포 후 app.public-base-url을 실제 도메인으로 바꿔야 동작함).
    @Transactional(readOnly = true)
    public String generatePublicUrl(String userId, String fileId) {
        findFile(userId, fileId); // 존재 + 소유권 확인
        String token = fileShareTokenUtil.generateToken(fileId);
        return publicBaseUrl + "/public/files/" + token;
    }

    // 공개 링크(토큰)를 통한 파일 접근. 토큰 검증은 호출부(PublicFileController)에서 이미 끝난 상태.
    @Transactional(readOnly = true)
    public ShareableFile downloadFileById(String fileId) throws MalformedURLException {
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다."));
        if (file.getIsDirectory()) {
            throw new RuntimeException("폴더는 다운로드할 수 없습니다.");
        }

        Path filePath = Paths.get(file.getStoragePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists()) {
            throw new RuntimeException("파일을 찾을 수 없습니다.");
        }

        return new ShareableFile(resource, file.getMimeType(), file.getName());
    }

    public record ShareableFile(Resource resource, String mimeType, String filename) {}

    // 파일/폴더 삭제
    @Transactional
    public void deleteFile(String userId, String fileId) throws IOException {
        FileEntity file = findFile(userId, fileId);

        if (!file.getIsDirectory() && file.getStoragePath() != null) {
            Files.deleteIfExists(Paths.get(file.getStoragePath()));
        }

        fileRepository.delete(file);
    }

    // 파일 조회 + 권한 확인
    private FileEntity findFile(String userId, String fileId) {
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다."));
        if (!file.getUser().getId().equals(userId)) {
            throw new RuntimeException("해당 파일에 대한 권한이 없습니다.");
        }
        return file;
    }

    // 확장자 추출
    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}
