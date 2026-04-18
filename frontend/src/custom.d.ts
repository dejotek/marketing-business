// Allow importing styles and assets without TypeScript errors
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}
 
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
 
declare module '*.scss';
declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';
 
export {};