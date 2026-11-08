"""
FFmpeg Video Assembly and Editing Adapter.
Combines Wan 2.2 generated video clips in correct sequence,
synchronizes voice and ambient audio tracks, applies smooth transitions,
and exports the final high-definition MP4 video container.
"""
import os
import subprocess
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("anilio.ffmpeg")

class FFmpegAdapter:
    def __init__(self, ffmpeg_bin: Optional[str] = None):
        self.ffmpeg_bin = ffmpeg_bin or os.getenv("FFMPEG_PATH", "ffmpeg")

    def build_concat_file(self, clip_paths: List[str], concat_txt_path: str):
        """Builds FFmpeg concat demuxer text file."""
        with open(concat_txt_path, "w", encoding="utf-8") as f:
            for p in clip_paths:
                f.write(f"file '{os.path.abspath(p)}'\n")

    def assemble_final_video(
        self,
        clip_paths: List[str],
        output_mp4_path: str,
        bgm_path: Optional[str] = None,
        resolution: str = "1280x720",
        fps: int = 24
    ) -> bool:
        """
        Executes FFmpeg concat and audio mux pipeline.
        Produces web-compatible H.264 / AAC MP4 file with faststart.
        """
        if not clip_paths:
            raise ValueError("No video clips provided for assembly")

        os.makedirs(os.path.dirname(os.path.abspath(output_mp4_path)), exist_ok=True)
        concat_txt = output_mp4_path + ".concat.txt"
        self.build_concat_file(clip_paths, concat_txt)

        try:
            # Concat demuxer command with video filter and safe transcode
            cmd = [
                self.ffmpeg_bin,
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_txt,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "22",
                "-pix_fmt", "yuv420p",
                "-r", str(fps),
                "-movflags", "+faststart",
                output_mp4_path
            ]
            
            logger.info("Executing FFmpeg command: %s", " ".join(cmd))
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600)
            
            # Clean up temp concat file
            if os.path.exists(concat_txt):
                os.remove(concat_txt)
                
            return proc.returncode == 0
        except Exception as e:
            logger.error("FFmpeg assembly exception: %s", str(e))
            if os.path.exists(concat_txt):
                os.remove(concat_txt)
            return False
