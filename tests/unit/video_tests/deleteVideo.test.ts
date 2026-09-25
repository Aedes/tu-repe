import { Club } from "../../../src/models/Club";
import { Court } from "../../../src/models/Court";
import { Video } from "../../../src/models/Video";
import { ClubService } from "../../../src/services/ClubService";
import { CourtService } from "../../../src/services/CourtService";
import { VideoService } from "../../../src/services/VideoService";

test("debería eliminar un video correctamente", async () => {
    const club = new Club("Club for Video Deletion", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId");
    const savedClub = await ClubService.createClub(club);

    const court = new Court(savedClub.id!, "Court for Video Deletion", "192.168.0.1", "/stream1", "encryptedPass1");
    const savedCourt = await CourtService.createCourt(court);

    const startTime = new Date("2024-01-01T10:00:00Z");
    const endTime = new Date("2024-01-01T10:10:00Z");

    const video = new Video(savedCourt.id!, "video_to_delete.mp4", startTime, endTime, "/example/path/video1.mp4");
    const savedVideo = await VideoService.createVideo(video);

    const deletionResult = await VideoService.deleteVideo(savedVideo.id!);

    expect(deletionResult).toBe(true);

    const fetchedVideo = await VideoService.findVideoById(savedVideo.id!);
    expect(fetchedVideo?.status).toBe("deleting");
})