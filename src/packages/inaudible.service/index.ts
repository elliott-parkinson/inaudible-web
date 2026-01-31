import { InaudibleMediaProgressService } from "./media-progress";
import { InaudibleSynchronizationService } from "./sync";
import { DiscoverService } from "./discover-service";
import { StatsService } from "./stats-service";
import { ProfileService } from "./profile-service";
import { LibraryService } from "./library-service";
import { MyLibraryService } from "./my-library-service";


export class InaudibleService {
    sync: InaudibleSynchronizationService;
    progress: InaudibleMediaProgressService;
    discover: DiscoverService;
    stats: StatsService;
    profile: ProfileService;
    library: LibraryService;
    myLibrary: MyLibraryService;
    
    constructor(container: Map<string, object>) {
        this.sync = new InaudibleSynchronizationService(container);
        this.progress = new InaudibleMediaProgressService(container);
        this.discover = new DiscoverService(container);
        this.stats = new StatsService(container);
        this.profile = new ProfileService(container);
        this.library = new LibraryService(container);
        this.myLibrary = new MyLibraryService(container, this.progress);
    }
}
