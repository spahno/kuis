import {Component} from '@angular/core';
import {StorageService} from '../../services/storage/storage.service';
import {Frage} from '../../models/frage';
import {Router} from '@angular/router';
import {AuthService} from '../../services/auth/auth.service';
import {ModulService} from '../../services/modul/modul.service';
import {ToastService} from '../../services/toast/toast.service';
import {Abzeichen} from '../../models/abzeichen';
import {Subscription} from 'rxjs';
import {AbzeichenService} from '../../services/abzeichen/abzeichen.service';
import {Statistik} from '../../models/statistik';
import {StatistikService} from '../../services/statistik/statistik.service';
import {AlreadyLearned} from '../../models/alreadyLearned';
import {PopoverController} from '@ionic/angular';
import {PopoverQuelleComponent} from '../popover-quelle/popover-quelle.component';

@Component({
    selector: 'app-frage',
    templateUrl: './frage.component.html',
    styleUrls: ['./frage.component.scss'],
})
export class FrageComponent {

    f = new Frage();
    bild = '';
    counter = 0;
    richtigBeantwortetLernmodusCounter = 0;
    richtigBeantwortetFreiermodusCounter = 0;
    timer = 0;
    interval;
    statistikArray: Statistik[] = [];
    correctIds = [];
    wrongIds = [];
    disabled = false;
    richtig1 = false;
    richtig2 = false;
    richtig3 = false;
    richtig4 = false;
    falsch1 = false;
    falsch2 = false;
    falsch3 = false;
    falsch4 = false;
    abzeichenArray: Abzeichen[] = [];
    subAbzeichen: Subscription;
    subUser: Subscription;
    showQuelle = false;

    constructor(public storageService: StorageService,
                public modulService: ModulService,
                private abzeichenService: AbzeichenService,
                private authService: AuthService,
                private toastService: ToastService,
                private statistikService: StatistikService,
                private router: Router,
                private popoverController: PopoverController) {
        this.toastService.presentLoading('Quiz wird geladen...')
            .then(async () => {
                if (this.authService.user === undefined) {
                    if (localStorage.getItem('userID')) {
                        this.subUser = await this.authService.findById(localStorage.getItem('userID'))
                            .subscribe(async u => {
                                this.authService.user = await u;
                                this.authService.subUser = await this.subUser;
                                await this.subUser.unsubscribe();
                            });
                    }
                    if (sessionStorage.getItem('userID')) {
                        this.subUser = await this.authService.findById(sessionStorage.getItem('userID'))
                            .subscribe(async u => {
                                this.authService.user = await u;
                                this.authService.subUser = await this.subUser;
                                await this.subUser.unsubscribe();
                            });
                    }
                }
                this.subAbzeichen = await this.abzeichenService.findAllAbzeichen()
                    .subscribe(async data => {
                        // await this.authService.checkIfLoggedIn();
                        this.abzeichenArray = data;
                        this.sortAbzeichen();
                    });
                await this.toastService.dismissLoading();
            });


        this.initialize();
        if (this.modulService.isLernmodus) {
            this.startTimer();
        }
    }

    /**
     * Method to increment the timer every second.
     */
    startTimer() {
        this.interval = setInterval(() => {
            this.timer++;
        }, 1000);
    }

    /**
     * Method to pause the incrementation of the timer.
     */
    pauseTimer() {
        clearInterval(this.interval);
    }

    /**
     * Method to show the next question, if the quiz is not finished yet.
     * if this was the last question update user with stats and navigate to statistik
     */
    showNextQuestion() {
        if (this.counter + 1 === this.storageService.fragen.length) {
            if (this.modulService.isLernmodus) {
                this.pauseTimer();
                this.authService.user.historieLernmodus.push(this.richtigBeantwortetLernmodusCounter);
                this.authService.user.gesamtzeit = this.authService.user.gesamtzeit + this.timer;
                this.modulService.isLernmodus = false;
                this.swapQuestionsToalreadyLearned();
                this.inkrementQuestionsCounterFromUser();
                this.abzeichenService.checkAbzeichen(this.timer, this.abzeichenArray);
                this.authService.updateProfile(this.authService.user);
                this.statistikService.printLastRound(this.statistikArray, this.richtigBeantwortetLernmodusCounter);
                this.router.navigate(['/statistik']);
            } else {
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < this.authService.user.importierteModule.length; i++) {
                    if (this.authService.user.importierteModule[i].name === this.storageService.nameDesModuls) {
                        if (this.authService.user.importierteModule[i].bestResult < this.richtigBeantwortetFreiermodusCounter) {
                            this.authService.user.importierteModule[i].bestResult = this.richtigBeantwortetFreiermodusCounter;
                            this.authService.user.importierteModule[i].zuletztGespielt = new Date().toLocaleString();
                            break;
                        }
                    }
                }
                this.authService.user.historieFreiermodusName.push(this.storageService.nameDesModuls);
                this.authService.user.historieFreiermodusAnzahl.push(this.richtigBeantwortetFreiermodusCounter + '/' +
                    this.storageService.fragen.length);

                this.authService.updateProfile(this.authService.user);
                this.toastService.presentToast('Das Modul wurde abgeschlossen.');
                this.modulService.disableStart = true;
                setTimeout(() => {
                        this.modulService.disableStart = false;
                    }, 1000);
                this.router.navigate(['/moduluebersicht']);
            }
        } else {
            this.counter++;
            this.initialize();
        }
    }

    /**
     * Method to overwrite the current question with the values of the upcoming question.
     */
    async initialize() {
        this.f.id = this.storageService.fragen[this.counter].id;
        this.f.frage = this.storageService.fragen[this.counter].frage;
        this.f.antworten = this.storageService.fragen[this.counter].antworten;
        this.shuffleAntworten(this.f.antworten);
        this.f.richtigeAntwort = this.storageService.fragen[this.counter].richtigeAntwort;
        this.f.bild = this.storageService.fragen[this.counter].bild;
        this.f.quelle = this.storageService.fragen[this.counter].quelle;
        this.showQuelle = false;

        await this.storageService.getPicture(this.f.bild)
            .then((url) => {
                this.bild = url;
            })
            .catch((err) => {
                console.log(err);
            });
    }

    /**
     * Method to shuffle the array containing the answers.
     * @param array array that will be shuffled.
     */
    shuffleAntworten(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    /**
     * Method to submit the answer and receive feedback.
     * @param gewaehlteAntwort answer that the user has chosen.
     */

    submitAnswer(gewaehlteAntwort: string) {
        const statisticObject = new Statistik();
        statisticObject.richtigeAntwort = this.f.richtigeAntwort;
        statisticObject.gewaehlteAntwort = gewaehlteAntwort;
        statisticObject.frage = this.f.frage;
        statisticObject._showBeschreibung = false;
        this.statistikArray.push(statisticObject);
        if (this.f.richtigeAntwort === gewaehlteAntwort) {
            // richtige Antwort markieren
            if (this.f.antworten[0] === gewaehlteAntwort) {
                this.richtig1 = true;
            }
            if (this.f.antworten[1] === gewaehlteAntwort) {
                this.richtig2 = true;
            }
            if (this.f.antworten[2] === gewaehlteAntwort) {
                this.richtig3 = true;
            }
            if (this.f.antworten[3] === gewaehlteAntwort) {
                this.richtig4 = true;
            }

            if (this.modulService.isLernmodus) {
                this.correctIds.push(this.f.id);
                this.richtigBeantwortetLernmodusCounter++;
            } else {
                this.richtigBeantwortetFreiermodusCounter++;
            }
            this.disabled = true;
            setTimeout(() => {
                this.showNextQuestion();
                this.disabled = false;
                this.disabled = false;
                this.richtig1 = false;
                this.richtig2 = false;
                this.richtig3 = false;
                this.richtig4 = false;
            }, 1800);
        } else {
            if (this.modulService.isLernmodus) {
                this.wrongIds.push(this.f.id);
            }

            // falsche Antwort markieren
            if (gewaehlteAntwort === this.f.antworten[0]) {
                this.falsch1 = true;
            }
            if (gewaehlteAntwort === this.f.antworten[1]) {
                this.falsch2 = true;
            }
            if (gewaehlteAntwort === this.f.antworten[2]) {
                this.falsch3 = true;
            }
            if (gewaehlteAntwort === this.f.antworten[3]) {
                this.falsch4 = true;
            }

            // richtige Antwort markieren, wenn falsch beantwortet
            if (this.f.antworten[0] === this.f.richtigeAntwort) {
                this.richtig1 = true;
            }
            if (this.f.antworten[1] === this.f.richtigeAntwort) {
                this.richtig2 = true;
            }
            if (this.f.antworten[2] === this.f.richtigeAntwort) {
                this.richtig3 = true;
            }
            if (this.f.antworten[3] === this.f.richtigeAntwort) {
                this.richtig4 = true;
            }
            this.disabled = true;
            setTimeout(() => {
                this.showNextQuestion();
                this.disabled = false;
                this.richtig1 = false;
                this.richtig2 = false;
                this.richtig3 = false;
                this.richtig4 = false;
                this.falsch1 = false;
                this.falsch2 = false;
                this.falsch3 = false;
                this.falsch4 = false;
            }, 1800);
        }

    }


    /**
     * Checks the array one time at the end of the game and resets the counter of any wrong answered question to 0
     */
    swapQuestionsToalreadyLearned() {
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < this.wrongIds.length; i++) {
            // tslint:disable-next-line:prefer-for-of
            for (let j = 0; j < this.authService.user.availableQuestions.length; j++) {
                if (this.wrongIds[i] === this.authService.user.availableQuestions[j].id) {
                    this.authService.user.availableQuestions[j].counter = 0;
                }
            }
        }
    }

    /**
     * Method to remove a question from the user's available questions array,
     * if the question was correctly answered six times in a row
     */
    inkrementQuestionsCounterFromUser() {
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < this.correctIds.length; i++) {

            for (let j = 0; j < this.authService.user.availableQuestions.length; j++) {
                if (this.correctIds[i] === this.authService.user.availableQuestions[j].id) {
                    this.authService.user.availableQuestions[j].counter += 1;
                    if (this.authService.user.availableQuestions[j].counter === 6) {
                        // tslint:disable-next-line:max-line-length
                        const object = new AlreadyLearned(this.authService.user.availableQuestions[j].id, this.authService.user.availableQuestions[j].idModul);
                        this.modulService.addAlreadyLearned(object);
                        this.authService.user.availableQuestions.splice(j, 1);
                    }
                }
            }
        }
    }

    /**
     * method to sort all abzeichen by index
     */
    sortAbzeichen() {
        this.abzeichenArray.sort(((a, b) => {
            return a.index - b.index;
        }));
    }

    /**
     * This method shows a popover with the source of the image.
     * @param ev -  is the event within the event is target.
     * @param quelle - from the picture
     */
    async setShowQuelle(ev: any, quelle: string) {
        const popover = await this.popoverController.create({
            component: PopoverQuelleComponent,
            componentProps: {quelle},
            event: ev,
            translucent: true,
            backdropDismiss: true,
            mode: 'ios'
        });
        return await popover.present();
    }
}
