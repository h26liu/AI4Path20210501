import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { BrainCellComponent } from './braincell/braincell.component';
import { SmallimgComponent } from './smallimg/smallimg.component';
import { WslComponent } from './wsl/wsl.component';
import { HttpClientModule } from '@angular/common/http';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
    NoopAnimationsModule,
    BrowserAnimationsModule,
} from '@angular/platform-browser/animations';
import { DetectorComponent } from './detector/detector.component';
import { AnnotatorComponent } from './annotator/annotator.component';
import { Annotatorv2Component } from './annotatorv2/annotatorv2.component';

import { SimpleNotificationsModule } from 'angular2-notifications';
import { RelearningComponent } from './relearning/relearning.component';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ColorPickerModule } from 'ngx-color-picker';
import { TooltipModule } from 'ng2-tooltip-directive';
import { Ki67detectorComponent } from './ki67detector/ki67detector.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MitosisComponent } from './mitosis/mitosis.component';
import { MitosisSegmentedComponent } from './mitosis-segmented/mitosis-segmented.component';
import { MitosisWslComponent } from './mitosis-wsl/mitosis-wsl.component';
import { MitosisdetectorComponent } from './mitosisdetector/mitosisdetector.component';
import { WholeslideComponent } from './wholeslide/wholeslide.component';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        BrainCellComponent,
        SmallimgComponent,
        WslComponent,
        DetectorComponent,
        AnnotatorComponent,
        Annotatorv2Component,
        RelearningComponent,
        Ki67detectorComponent,
        MitosisComponent,
        MitosisSegmentedComponent,
        MitosisWslComponent,
        MitosisdetectorComponent,
        WholeslideComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        SimpleNotificationsModule.forRoot({
            position: ['top', 'right'],
            timeOut: 3000,
            showProgressBar: true,
            pauseOnHover: true,
            clickToClose: false,
            maxLength: 20,
        }),
        AppRoutingModule,
        HttpClientModule,
        MatSliderModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatSnackBarModule,
        MatSelectModule,
        MatStepperModule,
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        NgxSpinnerModule,
        ColorPickerModule,
        TooltipModule,
        FontAwesomeModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
