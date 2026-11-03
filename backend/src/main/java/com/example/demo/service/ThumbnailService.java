package com.example.demo.service;

import com.example.demo.entity.FileEntity;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

// NAS 그리드에서 이미지/영상/PDF를 작은 썸네일로 보여주기 위한 서비스. 원래는 원본 파일 전체를
// 그대로 내려받아 브라우저가 CSS로 줄여서 보여주는 방식이었는데, 영상/PDF가 클수록 그리드를
// 열 때마다 매번 전체를 다시 받아와서 느렸음 - 작게 미리 렌더링해서 디스크에 캐싱해두고 그걸 내려줌.
@Slf4j
@Service
public class ThumbnailService {

    private static final int THUMBNAIL_MAX_SIZE = 360;

    @Value("${file.upload-dir}")
    private String uploadDir;

    // 캐시된 썸네일이 있으면 그 경로를 바로 반환하고, 없으면 새로 만들어서 캐싱한 뒤 반환함.
    // 생성에 실패하면(지원 안 하는 코덱, 손상된 파일 등) null을 반환 - 호출 쪽에서 원본/아이콘으로 대체함
    public Path getOrCreateThumbnail(String userId, FileEntity file) {
        Path thumbPath = thumbnailPath(userId, file.getId());
        if (Files.exists(thumbPath)) return thumbPath;

        Path original = Paths.get(file.getStoragePath());
        if (!Files.exists(original)) return null;

        try {
            Files.createDirectories(thumbPath.getParent());
            String mimeType = file.getMimeType() != null ? file.getMimeType() : "";
            boolean created;
            if (mimeType.startsWith("image/")) {
                created = renderImage(original, thumbPath);
            } else if (mimeType.equals("application/pdf")) {
                created = renderPdf(original, thumbPath);
            } else if (mimeType.startsWith("video/")) {
                created = renderVideoFrame(original, thumbPath);
            } else {
                return null;
            }
            return created ? thumbPath : null;
        } catch (Exception e) {
            log.warn("썸네일 생성 실패 (fileId={}): {}", file.getId(), e.getMessage());
            return null;
        }
    }

    private Path thumbnailPath(String userId, String fileId) {
        return Paths.get(uploadDir, userId, "_thumbnails", fileId + ".jpg");
    }

    private boolean renderImage(Path original, Path target) throws IOException {
        BufferedImage source = ImageIO.read(original.toFile());
        if (source == null) return false;
        return writeJpeg(scale(source), target);
    }

    private boolean renderPdf(Path original, Path target) throws IOException {
        try (PDDocument doc = Loader.loadPDF(original.toFile())) {
            if (doc.getNumberOfPages() == 0) return false;
            PDFRenderer renderer = new PDFRenderer(doc);
            // 72 DPI 정도로 적당히 크게 뽑은 뒤 scale()에서 다시 썸네일 크기로 줄임
            BufferedImage page = renderer.renderImageWithDPI(0, 72);
            return writeJpeg(scale(page), target);
        }
    }

    // ffmpeg를 외부 프로세스로 실행해서 1초 지점 프레임 하나를 뽑아 바로 target 경로에 저장.
    // ffmpeg 자체가 이미 -vf scale로 축소해서 내보내므로 scale()/writeJpeg() 안 거침
    private boolean renderVideoFrame(Path original, Path target) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg", "-y", "-ss", "1", "-i", original.toString(),
                "-frames:v", "1", "-vf", "scale=" + THUMBNAIL_MAX_SIZE + ":-1",
                target.toString()
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();
        // 출력을 안 읽고 버리면 ffmpeg 로그로 파이프 버퍼가 차서 프로세스가 멈출 수 있어 그냥 흘려보냄
        process.getInputStream().readAllBytes();
        boolean finished = process.waitFor(10, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            return false;
        }
        return process.exitValue() == 0 && Files.exists(target);
    }

    private BufferedImage scale(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        if (width <= THUMBNAIL_MAX_SIZE && height <= THUMBNAIL_MAX_SIZE) return source;

        double ratio = Math.min((double) THUMBNAIL_MAX_SIZE / width, (double) THUMBNAIL_MAX_SIZE / height);
        int newWidth = Math.max(1, (int) (width * ratio));
        int newHeight = Math.max(1, (int) (height * ratio));

        BufferedImage scaled = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(source, 0, 0, newWidth, newHeight, null);
        g.dispose();
        return scaled;
    }

    // PNG 등 알파 채널이 있는 이미지는 JPEG로 바로 못 쓰니(투명 배경이 깨짐) 흰 배경에 합성해서 RGB로 변환
    private boolean writeJpeg(BufferedImage image, Path target) throws IOException {
        BufferedImage rgb = image;
        if (image.getType() != BufferedImage.TYPE_INT_RGB) {
            rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgb.createGraphics();
            g.drawImage(image, 0, 0, Color.WHITE, null);
            g.dispose();
        }
        return ImageIO.write(rgb, "jpg", target.toFile());
    }
}
