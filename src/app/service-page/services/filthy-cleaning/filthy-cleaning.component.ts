import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-filthy-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './filthy-cleaning.component.html',
  styleUrl: './filthy-cleaning.component.scss'
})
export class FilthyCleaningComponent {
  constructor() {}
} 