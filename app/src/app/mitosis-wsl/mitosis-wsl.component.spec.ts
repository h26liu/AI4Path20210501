import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MitosisWslComponent } from './mitosis-wsl.component';

describe('MitosisWslComponent', () => {
  let component: MitosisWslComponent;
  let fixture: ComponentFixture<MitosisWslComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MitosisWslComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MitosisWslComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
