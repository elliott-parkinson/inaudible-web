import { InaudibleSynchronizationService } from "./sync";


export class InaudibleService {
    sync: InaudibleSynchronizationService;
    
    constructor(container: Map<string, object>) {
        this.sync = new InaudibleSynchronizationService(container)
    }
}