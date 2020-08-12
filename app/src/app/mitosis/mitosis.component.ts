import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-mitosis',
  templateUrl: './mitosis.component.html',
  styleUrls: ['./mitosis.component.scss']
})
export class MitosisComponent implements OnInit {
  currentYear: any;
  constructor() { }

  ngOnInit(): void {
    this.currentYear = new Date().getFullYear();
  }

}
