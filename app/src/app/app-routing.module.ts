import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SmallimgComponent } from './smallimg/smallimg.component';
import { HomeComponent } from './home/home.component';
import { BrainCellComponent } from './braincell/braincell.component';
import { WslComponent } from './wsl/wsl.component';
import { AnnotatorComponent } from './annotator/annotator.component';
import { Annotatorv2Component } from './annotatorv2/annotatorv2.component';
import { RelearningComponent } from './relearning/relearning.component';
import { Ki67detectorComponent } from './ki67detector/ki67detector.component';
import { MitosisSegmentedComponent } from './mitosis-segmented/mitosis-segmented.component';
import { MitosisWslComponent } from './mitosis-wsl/mitosis-wsl.component';
import { MitosisComponent } from './mitosis/mitosis.component';

const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'braincell/segmentedimage',
        component: SmallimgComponent,
    },
    {
        path: 'braincell/wsl',
        component: WslComponent,
    },
    {
        path: 'annotator',
        component: AnnotatorComponent,
    },
    {
        path: 'annotatorv2',
        component: Annotatorv2Component,
    },
    {
        path: 'braincell',
        component: BrainCellComponent,
    },
    {
        path: 'relearning',
        component: RelearningComponent,
    },
    {
        path: 'ki67',
        component: Ki67detectorComponent,
    },
    {
        path:'mitosis',
        component:MitosisComponent

    },
    {
        path:'mitosis/segmentedimage',
        component:MitosisSegmentedComponent
    },
    {
        path: 'mitosis/wsl',
        component:MitosisWslComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
