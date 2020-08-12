import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RelearningComponent } from './relearning.component';

describe('RelearningComponent', () => {
  let component: RelearningComponent;
  let fixture: ComponentFixture<RelearningComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RelearningComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RelearningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
