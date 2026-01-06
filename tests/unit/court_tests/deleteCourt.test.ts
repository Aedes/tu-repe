import { Court } from "../../../src/models/Court";
import { Club } from "../../../src/models/Club";
import { CourtService } from "../../../src/services/CourtService";
import { ClubService } from "../../../src/services/ClubService";
import fs from "fs"
import path from "path"

test("debería eliminar una cancha y sus directorios correctamente", async () => {
    const club = new Club("Club for Court Deletion", "08:00", "22:00", 60);
    const savedClub = await ClubService.createClub(club);

    const court = new Court(savedClub.id!, "Court to Delete", "rtsp://example.com/delete");
    const savedCourt = await CourtService.createCourt(court);

    const deletionResult = await CourtService.deleteCourt(savedCourt.id!);

    expect(deletionResult).toBe(true);

    const clubPath = path.join(`/var/videos`, `club_${savedClub.id}`)
    const courtPath = path.join(clubPath, `court_${savedCourt.id}`)

    expect(fs.existsSync(courtPath)).toBe(false)

    const fetchedCourt = await CourtService.findCourtById(savedCourt.id!);
    expect(fetchedCourt).toBeNull();
})