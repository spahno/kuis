import {Component, ViewChild} from '@angular/core';
import {StorageService} from '../../services/storage/storage.service';
import {Router} from '@angular/router';
import {ModulService} from '../../services/modul/modul.service';
import {Modul} from '../../models/modul';
import {IonInput, ViewDidEnter} from '@ionic/angular';
import {ToastService} from '../../services/toast/toast.service';
import {AuthService} from '../../services/auth/auth.service';

@Component({
    selector: 'app-moduluebersicht',
    templateUrl: './moduluebersicht.page.html',
    styleUrls: ['./moduluebersicht.page.scss'],
})
export class ModuluebersichtPage implements ViewDidEnter {
    module: Modul[] = [];
    filteredModules: Modul[] = [];
    url = '';
    @ViewChild(IonInput) search: IonInput;

    constructor(private modulService: ModulService,
                public storageService: StorageService,
                private toastService: ToastService,
                private router: Router) {
        this.toastService.presentLoading('Fragenmodule werden geladen...')
            .then(async () => {
                await modulService.findAllModule()
                    .subscribe(async data => {
                        this.module = data;
                        // this.myModule = this.module.filter(a => {
                        //  return this.authService.getUser().importierteModule.includes(a.id);
                        // });
                        this.filteredModules = data;
                    });
                await this.toastService.dismissLoading();
            });
    }

    chooseQuiz(name: string, id: string, bild: string) {
        this.storageService.findAll(id, name)
            .then(() => {
                this.storageService.getPicture(bild).then((res) => {
                    this.url = res;
                });
                this.router.navigate(['/quiz']);
            });
    }

    /**
     * This function returns a filtered array of the modules based on a given query.
     */
    async doSearch() {
        const input = await this.search.getInputElement();
        const searchValue = input.value;
        this.filteredModules = this.module.filter(a => {
            return a.titel.toLowerCase().includes(searchValue.toLowerCase());
        });
    }

    clear() {
        this.search.value = '';
        this.filteredModules = this.module;
    }

    deleteModule() {
        console.log('Yet to be implemented!');
    }

    ionViewDidEnter() {
        setTimeout(() => this.search.setFocus(), 10);
    }
}
