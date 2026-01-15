import { InaudibleMediaProgressService } from "./media-progress";
import { InaudibleSynchronizationService } from "./sync";


export class InaudibleService {
    sync: InaudibleSynchronizationService;
    progress: InaudibleMediaProgressService;
    
    constructor(container: Map<string, object>) {
        this.sync = new InaudibleSynchronizationService(container)
        this.progress = new InaudibleMediaProgressService(container)
    }
}