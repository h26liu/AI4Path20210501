import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-braincell',
    templateUrl: './braincell.component.html',
    styleUrls: ['./braincell.component.scss'],
})
export class BrainCellComponent implements OnInit {
    currentYear: any;

    constructor() {}

    ngOnInit(): void {
        this.currentYear = new Date().getFullYear();
    }
}
