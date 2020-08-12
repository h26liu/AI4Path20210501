import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'myapp';

    currentRouter: any;

    faQuestionCircle = faQuestionCircle;

    constructor(private router: Router) {
        this.currentRouter = router;
    }
}
