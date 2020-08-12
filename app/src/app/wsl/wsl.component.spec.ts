import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WslComponent } from './wsl.component';

describe('WslComponent', () => {
  let component: WslComponent;
  let fixture: ComponentFixture<WslComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WslComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WslComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
