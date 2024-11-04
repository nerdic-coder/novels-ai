import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PovComponent } from './pov.component';

describe('PovComponent', () => {
  let component: PovComponent;
  let fixture: ComponentFixture<PovComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PovComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PovComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
