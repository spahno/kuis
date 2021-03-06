import {Component, OnDestroy, ViewChild} from '@angular/core';
import {StorageService} from '../../services/storage/storage.service';
import {Router} from '@angular/router';
import {ModulService} from '../../services/modul/modul.service';
import {AlertController, IonInput, IonRouterOutlet, ModalController, PopoverController} from '@ionic/angular';
import {ToastService} from '../../services/toast/toast.service';
import {ModuluebersichtAddPage} from '../moduluebersicht-add/moduluebersicht-add.page';
import {AuthService} from '../../services/auth/auth.service';
import {Subscription} from 'rxjs';
import {PopoverFilterComponent} from '../../components/popover-filter/popover-filter.component';
import {Modul} from '../../models/modul';


@Component({
    selector: 'app-moduluebersicht',
    templateUrl: './moduluebersicht.page.html',
    styleUrls: ['./moduluebersicht.page.scss'],
})
export class ModuluebersichtPage implements OnDestroy {
    isEdit = false;
    subUser: Subscription;
    @ViewChild(IonInput) search: IonInput;

    constructor(private authService: AuthService,
                public modulService: ModulService,
                public storageService: StorageService,
                private toastService: ToastService,
                private router: Router,
                private modalController: ModalController,
                private routerOutlet: IonRouterOutlet,
                public popoverController: PopoverController,
                private alertController: AlertController) {
        localStorage.removeItem('modus');
        this.toastService.presentLoading('Module werden geladen...')
            .then(async () => {
                await this.authService.loadPageSubscription(() => {
                    this.modulService.loadImportedModule();
                });
                await this.toastService.dismissLoading();
            });
    }

    /**
     * Method to receive all questions from a quiz module.
     * @param titel title of the chosen quiz.
     * @param name name of the quiz-module.
     * @param id id of the chosen quiz.
     * @param bild name of the picture of the chosen quiz.
     */
    chooseQuiz(titel: string, id: string, bild: string, name: string) {
        if (this.modulService.disableStart === false) {
            this.modulService.started = true;
            this.modulService.isFreiermodus = true;
            localStorage.setItem('modus', 'frei');
            this.storageService.findAllFragen(id, titel, name)
                .then(() => {
                    this.router.navigate(['/quiz']);
                });
        }
    }

    /**
     * Method to fill an array with the filtered values.
     */
    async doSearch() {
        const input = await this.search.getInputElement();
        const searchValue = input.value;
        this.modulService.filteredModules = this.modulService.importedModule.filter(a => {
            return a.name.toLowerCase().includes(searchValue.toLowerCase());
        });
    }

    /**
     * Method to remove the search value.
     */
    clear() {
        this.search.value = '';
        this.modulService.setModuleEqual();
    }

    /**
     * Method opens Modal to import module.
     */
    async presentModalAddModule() {
        this.isEdit = false;
        const modal = await this.modalController.create({
            component: ModuluebersichtAddPage,
            swipeToClose: true,
            presentingElement: this.routerOutlet.nativeEl,
            mode: 'ios'
        });
        return await modal.present();
    }

    /**
     * toggle edit mode
     */
    edit() {
        this.isEdit = true;
    }

    /**
     * toggle edit mode
     */
    undoEdit() {
        this.isEdit = false;
    }

    /**
     * Handles the different events to the changing Button at the bottom of the modules.
     * If the user is not in Edit-Mode, clicking on the button will start the selected Quiz.
     * Otherwise it will be removed from the imported Modules.
     *
     * @param module is the quiz which is either started or deleted.
     */
    async onButtonClick(module) {
        if (this.isEdit === false) {
            this.chooseQuiz(module.titel, module.id, module.bild, module.name);
        } else {
            this.presentAlertDelete(module);
        }
    }

    /**
     * This Method shows a popover to filter and sort the ModuleAnsicht.
     * @param ev is the event within the event is target.
     */
    async presentPopover(ev: any) {
        const popover = await this.popoverController.create({
            component: PopoverFilterComponent,
            event: ev,
            translucent: true,
            backdropDismiss: true,
            mode: 'ios',
        });
        return await popover.present();
    }

    /**
     * This Method opens a Modal with the choice to delete a Modul or cancel it.
     * @param module is the Modul that will be deleted.
     */
    async presentAlertDelete(module: Modul) {
        const alert = await this.alertController.create({
            mode: 'ios',
            header: module.name + ' Quiz löschen?',
            message: 'Wenn Sie das Modul löschen gehen alle Spielstände verloren.',
            buttons: [
                {
                    text: 'Abbrechen',
                    role: 'cancel',
                    cssClass: 'secondary',
                    handler: () => {
                    }
                }, {
                    text: 'Löschen',
                    handler: () => {
                        if (this.modulService.module.length === 1) {
                            this.isEdit = false;
                        }
                        this.clear();
                        this.modulService.deleteModule(module);
                    }
                }
            ]
        });

        await alert.present();
    }

    /**
     * unsubschribe modules when component is destroyed
     */
    ngOnDestroy() {
        // this.modulService.subModule.unsubscribe();
        this.modulService.module = [];
        this.modulService.filteredModules = [];
    }
}
