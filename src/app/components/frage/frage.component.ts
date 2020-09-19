import {Component} from '@angular/core';
import {StorageService} from '../../services/storage/storage.service';
import {Frage} from '../../models/frage';
import {Router} from '@angular/router';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth/auth.service';
import {ModulService} from '../../services/modul/modul.service';
import {ToastService} from '../../services/toast/toast.service';

@Component({
    selector: 'app-frage',
    templateUrl: './frage.component.html',
    styleUrls: ['./frage.component.scss'],
})
export class FrageComponent {

    f = new Frage();
    bild = '';
    counter = 0;
    richtigBeantwortetCounter = 0;
    user: User;
    timer = 0;
    interval;

    constructor(public storageService: StorageService,
                public modulService: ModulService,
                private authService: AuthService,
                private toastService: ToastService,
                private router: Router) {
        this.initialize();
        this.user = this.authService.getUser();
        // TODO nur wenn im Lernmodus
        if (this.modulService.isLernmodus) {
            this.startTimer();
        }
    }

    startTimer() {
        this.interval = setInterval(() => {
            this.timer++;
        }, 1000);
    }

    pauseTimer() {
        clearInterval(this.interval);
    }

    showNextQuestion() {
        this.counter++;
        if (this.counter === this.storageService.fragen.length) {
            if (this.modulService.isLernmodus) {
                this.pauseTimer();
                this.user.historieLernmodus.push(this.richtigBeantwortetCounter);
                this.user.gesamtzeit = this.user.gesamtzeit + this.timer;
                this.modulService.isLernmodus = false;
                this.authService.updateProfile(this.user);
                this.router.navigate(['/statistik']);
            } else {
                this.toastService.presentToast('Das Modul wurde abgeschlossen.');
                this.router.navigate(['/moduluebersicht']);
            }
        } else {
            this.initialize();
        }
    }

    async initialize() {
        this.f.id = this.storageService.fragen[this.counter].id;
        this.f.frage = this.storageService.fragen[this.counter].frage;
        this.f.antworten = this.storageService.fragen[this.counter].antworten;
        this.shuffleAntworten(this.f.antworten);
        this.f.richtigeAntwort = this.storageService.fragen[this.counter].richtigeAntwort;
        this.f.bild = this.storageService.fragen[this.counter].bild;

        await this.storageService.getPicture(this.f.bild)
            .then((url) => {
                this.bild = url;
            })
            .catch((err) => {
                console.log(err);
            });
    }

    shuffleAntworten(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    submitAnswer(gewaehlteAntwort: string) {
        if (this.f.richtigeAntwort === gewaehlteAntwort) {
            // TODO: - Style (grün, Konfetti)
            alert('richtig :)');
            this.richtigBeantwortetCounter++;
            setTimeout(() => {
                this.showNextQuestion();
            }, 2500);
        } else {
            // TODO: - Style (rot, Wackeln)
            alert('falsch :(');
            setTimeout(() => {
                this.showNextQuestion();
            }, 2500);
        }

    }

}
