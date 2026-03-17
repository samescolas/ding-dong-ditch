import { execFile } from "child_process";

export function extractFrameFromVideo(videoPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      "ffmpeg",
      ["-i", videoPath, "-vframes", "1", "-f", "image2", "-q:v", "2", "pipe:1"],
      { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`ffmpeg frame extraction failed: ${error.message}`));
          return;
        }
        if (!stdout || stdout.length === 0) {
          reject(new Error("ffmpeg produced no output"));
          return;
        }
        resolve(stdout);
      }
    );
    proc.stdin?.end();
  });
}
