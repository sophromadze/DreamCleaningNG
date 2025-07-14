import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-basic-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './basic-cleaning.component.html',
  styleUrl: './basic-cleaning.component.scss'
})
export class BasicCleaningComponent {
  constructor() {}
} 