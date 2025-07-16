import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-general-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './general-cleaning.component.html',
  styleUrl: './general-cleaning.component.scss'
})
export class GeneralCleaningComponent {
  constructor() {}
} 