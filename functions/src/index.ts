import { onObjectFinalized } from "firebase-functions/v2/storage";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as ffmpeg from "fluent-ffmpeg";

initializeApp();

/**
 * Transcodes uploaded video and audio to mobile-friendly formats (H.264/AAC).
 * Optimized with faststart flags for immediate playback on iOS and Android.
 */
export const transcodeMedia = onObjectFinalized({
    cpu: 2,
    memory: "2GiB",
    timeoutSeconds: 540,
}, async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const bucketName = event.data.bucket;

    // Only process media in the testimonies directory
    if (!filePath.startsWith("testimonies/")) return;
    
    // Prevent infinite loops by checking custom metadata
    if (event.data.metadata?.transcoded === "true") return;

    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    
    const isVideo = contentType?.startsWith("video/");
    const isAudio = contentType?.startsWith("audio/");
    
    if (!isVideo && !isAudio) return;

    const targetExtension = isVideo ? ".mp4" : ".m4a";
    const targetFileName = path.parse(fileName).name + "_transcoded" + targetExtension;
    const targetTempFilePath = path.join(os.tmpdir(), targetFileName);
    const targetStoragePath = path.join(path.dirname(filePath), targetFileName);

    const bucket = getStorage().bucket(bucketName);

    try {
        // Download source file
        await bucket.file(filePath).download({ destination: tempFilePath });

        // Run transcoding
        await new Promise((resolve, reject) => {
            let command = ffmpeg(tempFilePath);
            
            if (isVideo) {
                command = command
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions('-pix_fmt yuv420p')
                    .outputOptions('-movflags faststart') // Key for mobile seek/playback
                    .outputOptions('-preset ultrafast')
                    .toFormat('mp4');
            } else {
                command = command
                    .audioCodec('aac')
                    .outputOptions('-movflags faststart')
                    .toFormat('mp4'); // .m4a container
            }

            command
                .on('end', resolve)
                .on('error', (err) => {
                    console.error('FFmpeg Error:', err);
                    reject(err);
                })
                .save(targetTempFilePath);
        });

        // Upload transcoded version
        const [file] = await bucket.upload(targetTempFilePath, {
            destination: targetStoragePath,
            metadata: {
                contentType: isVideo ? "video/mp4" : "audio/mp4",
                metadata: {
                    transcoded: "true",
                    testimonyId: event.data.metadata?.testimonyId,
                    slot: event.data.metadata?.slot,
                }
            }
        });

        // Construct public URL (standard Firebase Storage format)
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(targetStoragePath)}?alt=media`;

        // Sync back to Firestore
        const testimonyId = event.data.metadata?.testimonyId;
        const slot = event.data.metadata?.slot;

        if (testimonyId && slot) {
            const db = getFirestore();
            const field = slot === "1" ? "mediaUrl" : "mediaUrl2";
            const typeField = slot === "1" ? "mediaType" : "mediaType2";
            
            await db.collection("testimonies").doc(testimonyId).update({
                [field]: publicUrl,
                [typeField]: isVideo ? "video" : "audio"
            });
            
            console.log(`Successfully transcoded and updated testimony ${testimonyId} slot ${slot}`);
        }

    } catch (error) {
        console.error("Transcoding task failed:", error);
    } finally {
        // Cleanup local temp storage
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(targetTempFilePath)) fs.unlinkSync(targetTempFilePath);
    }
});
