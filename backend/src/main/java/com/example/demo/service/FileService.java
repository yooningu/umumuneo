package com.example.demo.service;

import com.example.demo.dto.request.FileRequest;
import com.example.demo.dto.response.FileResponse;
import com.example.demo.entity.FileEntity;
import com.example.demo.entity.UploadSession;
import com.example.demo.entity.User;
import com.example.demo.repository.FileRepository;
import com.example.demo.repository.UploadSessionRepository;
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
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final UploadSessionRepository uploadSessionRepository;
    private final FileShareTokenUtil fileShareTokenUtil;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${app.public-base-url}")
    private String publicBaseUrl;

    // 파일 목록 조회
    @Transactional(readOnly = true)
    public List<FileResponse> getFiles(String userId, String parentId, Boolean isFavorite, String search, String source) {
        List<FileEntity> files;

        if (search != null && !search.isEmpty()) {
            files = fileRepository.findByUserIdAndNameContaining(userId, search);
        } else if (Boolean.TRUE.equals(isFavorite)) {
            files = fileRepository.findByUserIdAndIsFavoriteTrue(userId);
        } else if (source != null && !source.isBlank()) {
            // 출처로 걸러도 폴더 구조는 그대로 유지 - 루트/폴더 안을 평소처럼 탐색하되 그 출처가
            // 아닌 항목만 안 보이게 함 (전부 평면으로 쏟아내지 않음)
            FileEntity.FileSource src = FileEntity.FileSource.valueOf(source.toUpperCase());
            boolean treatNullAsThis = src == FileEntity.FileSource.UPLOAD;
            if (parentId != null) {
                files = treatNullAsThis
                        ? fileRepository.findByUserIdAndParentIdAndSourceOrNull(userId, parentId, src)
                        : fileRepository.findByUserIdAndParentIdAndSource(userId, parentId, src);
            } else {
                files = treatNullAsThis
                        ? fileRepository.findByUserIdAndParentIsNullAndSourceOrNull(userId, src)
                        : fileRepository.findByUserIdAndParentIsNullAndSource(userId, src);
            }
        } else if (parentId != null) {
            files = fileRepository.findByUserIdAndParentId(userId, parentId);
        } else {
            files = fileRepository.findByUserIdAndParentIsNull(userId);
        }

        return files.stream().map(FileResponse::new).toList();
    }

    // 파일 업로드 (업로드된 파일들의 메타데이터 반환 - id로 나중에 공개 링크 생성 등에 사용)
    // source: 누가 올린 건지(NAS 직접 업로드/챗봇 첨부 등) - null이면 기본값(UPLOAD)
    @Transactional
    public List<FileResponse> uploadFiles(String userId, MultipartFile[] files, String parentId, String source) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        FileEntity parent = null;
        if (parentId != null) {
            parent = fileRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("폴더를 찾을 수 없습니다."));
        }
        FileEntity.FileSource fileSource = source != null && !source.isBlank()
                ? FileEntity.FileSource.valueOf(source.toUpperCase())
                : FileEntity.FileSource.UPLOAD;

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
            fileEntity.setSource(fileSource);

            fileRepository.save(fileEntity);
            uploaded.add(new FileResponse(fileEntity));
        }

        return uploaded;
    }

    // 이메일로 받은 첨부파일 저장 (InboundEmailService에서 호출). base64로 받은 원본 바이트를
    // 일반 업로드와 똑같은 디스크 경로/파일 테이블에 저장하되 source=EMAIL + 어느 메일인지 연결해둔다.
    @Transactional
    public FileEntity saveEmailAttachment(User user, com.example.demo.entity.InboundEmail email,
                                           String filename, String contentType, byte[] data) throws IOException {
        Path userDir = Paths.get(uploadDir, user.getId());
        Files.createDirectories(userDir);

        String extension = getExtension(filename);
        String storedName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);
        Path targetPath = userDir.resolve(storedName);
        Files.write(targetPath, data);

        FileEntity fileEntity = new FileEntity();
        fileEntity.setUser(user);
        fileEntity.setName(filename);
        fileEntity.setStoragePath(targetPath.toString());
        fileEntity.setIsDirectory(false);
        fileEntity.setSizeBytes((long) data.length);
        fileEntity.setMimeType(contentType);
        fileEntity.setExtension(extension.isEmpty() ? null : extension);
        fileEntity.setIsFavorite(false);
        fileEntity.setSource(FileEntity.FileSource.EMAIL);
        fileEntity.setEmail(email);

        return fileRepository.save(fileEntity);
    }

    // ===== 큰 파일 조각(청크) 업로드 =====
    // Cloudflare가 프록시 요청 본문을 100MB로 제한해서, 그보다 큰 파일은 /upload로 한 번에 못 올림.
    // 그래서 큰 파일은 init(세션 시작) → chunk(조각마다 여러 번) → complete(합치기) 순서로 나눠 보낸다.
    // 받은 조각은 DB가 아니라 uploadDir/{userId}/_chunks/{sessionId}/{index} 경로에 그냥 파일로 쌓아두고,
    // complete 시점에 순서대로 이어붙여서 진짜 파일을 만든다.

    @Transactional
    public String initChunkedUpload(String userId, FileRequest.InitChunkedUpload request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        UploadSession session = new UploadSession();
        session.setUser(user);
        session.setFilename(request.getFilename());
        session.setContentType(request.getContentType());
        session.setTotalSize(request.getTotalSize());
        session.setTotalChunks(request.getTotalChunks());
        session.setParentId(request.getParentId());
        session.setSource(request.getSource());
        uploadSessionRepository.save(session);
        return session.getId();
    }

    // 조각 하나 저장 - DB는 안 건드리고 디스크에만 씀. readOnly 트랜잭션은 findUploadSession이
    // session.getUser()(지연 로딩)를 안전하게 읽을 수 있도록 Hibernate 세션을 열어두기 위함.
    @Transactional(readOnly = true)
    public void uploadChunk(String userId, String sessionId, int chunkIndex, MultipartFile chunk) throws IOException {
        findUploadSession(userId, sessionId); // 존재 + 소유권 확인
        Path chunkDir = chunkDir(userId, sessionId);
        Files.createDirectories(chunkDir);
        Files.copy(chunk.getInputStream(), chunkDir.resolve(String.valueOf(chunkIndex)), StandardCopyOption.REPLACE_EXISTING);
    }

    // 지금까지 받은 조각 번호들 - 중간에 끊겼다가 재개할 때, 이미 보낸 조각은 다시 안 보내려고 씀
    @Transactional(readOnly = true)
    public Set<Integer> getUploadedChunks(String userId, String sessionId) throws IOException {
        findUploadSession(userId, sessionId);
        Path chunkDir = chunkDir(userId, sessionId);
        if (!Files.exists(chunkDir)) return Set.of();
        try (var stream = Files.list(chunkDir)) {
            Set<Integer> result = new HashSet<>();
            stream.forEach(p -> result.add(Integer.parseInt(p.getFileName().toString())));
            return result;
        }
    }

    // 조각이 전부 모이면 순서대로 이어붙여서 진짜 FileEntity로 만들고, 임시 조각들은 정리한다
    @Transactional
    public FileResponse completeChunkedUpload(String userId, String sessionId) throws IOException {
        UploadSession session = findUploadSession(userId, sessionId);
        Path chunkDir = chunkDir(userId, sessionId);

        for (int i = 0; i < session.getTotalChunks(); i++) {
            if (!Files.exists(chunkDir.resolve(String.valueOf(i)))) {
                throw new RuntimeException("아직 전부 업로드되지 않았습니다 (조각 " + i + "번 누락).");
            }
        }

        FileEntity parent = null;
        if (session.getParentId() != null) {
            parent = fileRepository.findById(session.getParentId())
                    .orElseThrow(() -> new RuntimeException("폴더를 찾을 수 없습니다."));
        }

        Path userDir = Paths.get(uploadDir, userId);
        Files.createDirectories(userDir);
        String extension = getExtension(session.getFilename());
        String storedName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);
        Path targetPath = userDir.resolve(storedName);

        try (OutputStream out = Files.newOutputStream(targetPath)) {
            for (int i = 0; i < session.getTotalChunks(); i++) {
                Files.copy(chunkDir.resolve(String.valueOf(i)), out);
            }
        }

        FileEntity.FileSource fileSource = session.getSource() != null && !session.getSource().isBlank()
                ? FileEntity.FileSource.valueOf(session.getSource().toUpperCase())
                : FileEntity.FileSource.UPLOAD;

        FileEntity fileEntity = new FileEntity();
        fileEntity.setUser(session.getUser());
        fileEntity.setParent(parent);
        fileEntity.setName(session.getFilename());
        fileEntity.setStoragePath(targetPath.toString());
        fileEntity.setIsDirectory(false);
        fileEntity.setSizeBytes(Files.size(targetPath));
        fileEntity.setMimeType(session.getContentType());
        fileEntity.setExtension(extension.isEmpty() ? null : extension);
        fileEntity.setIsFavorite(false);
        fileEntity.setSource(fileSource);
        fileRepository.save(fileEntity);

        deleteDirectoryRecursive(chunkDir);
        uploadSessionRepository.delete(session);

        return new FileResponse(fileEntity);
    }

    // 업로드 취소 - 받아둔 조각들과 세션을 전부 지운다 (완성 안 된 파일은 서버에 안 남김)
    @Transactional
    public void cancelChunkedUpload(String userId, String sessionId) throws IOException {
        UploadSession session = findUploadSession(userId, sessionId);
        deleteDirectoryRecursive(chunkDir(userId, sessionId));
        uploadSessionRepository.delete(session);
    }

    private UploadSession findUploadSession(String userId, String sessionId) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("업로드 세션을 찾을 수 없습니다."));
        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("해당 업로드 세션에 대한 권한이 없습니다.");
        }
        return session;
    }

    private Path chunkDir(String userId, String sessionId) {
        return Paths.get(uploadDir, userId, "_chunks", sessionId);
    }

    private void deleteDirectoryRecursive(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.delete(p);
                } catch (IOException ignored) {
                    // 임시 조각 정리 실패는 치명적이지 않으므로 무시
                }
            });
        }
    }

    // 폴더 생성 (생성된 폴더 정보를 반환 - 폴더 업로드 시 그 안에 파일을 바로 넣을 수 있게 id가 필요함)
    @Transactional
    public FileResponse createDirectory(String userId, FileRequest.CreateDirectory request) {
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
        return new FileResponse(directory);
    }

    // 파일/폴더 이름 변경
    @Transactional
    public void rename(String userId, String fileId, FileRequest.Rename request) {
        FileEntity file = findFile(userId, fileId);
        file.setName(request.getName());
        fileRepository.save(file);
    }

    // 파일/폴더를 다른 폴더로 이동 (드래그앤드롭으로 타일을 폴더 위에 놓았을 때)
    @Transactional
    public void move(String userId, String fileId, FileRequest.Move request) {
        FileEntity file = findFile(userId, fileId);

        if (request.getParentId() == null) {
            file.setParent(null);
            fileRepository.save(file);
            return;
        }

        if (request.getParentId().equals(fileId)) {
            throw new RuntimeException("자기 자신에게는 이동할 수 없습니다.");
        }

        FileEntity newParent = findFile(userId, request.getParentId());
        if (!newParent.getIsDirectory()) {
            throw new RuntimeException("폴더가 아닌 곳으로는 이동할 수 없습니다.");
        }

        // 폴더를 자기 자신의 하위 폴더로 옮기면 순환 구조가 생기므로, 목적지가 옮기려는 폴더의
        // 자손인지 거슬러 올라가며 확인한다
        if (file.getIsDirectory()) {
            FileEntity cursor = newParent;
            while (cursor != null) {
                if (cursor.getId().equals(file.getId())) {
                    throw new RuntimeException("폴더를 자기 자신의 하위로 이동할 수 없습니다.");
                }
                cursor = cursor.getParent();
            }
        }

        file.setParent(newParent);
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
