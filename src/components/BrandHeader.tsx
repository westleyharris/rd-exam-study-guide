import { beachPhoto, pnutPhoto } from "../photos";

interface Props {
  subtitle?: string;
  children?: React.ReactNode;
}

export default function BrandHeader({
  subtitle = "Registered Dietitian exam — adaptive practice",
  children,
}: Props) {
  return (
    <div className="topbar">
      <div className="brand-photos" role="img" aria-label="Arely and Pnut">
        <img src={beachPhoto} alt="" className="photo-main photo-beach" />
        <img src={pnutPhoto} alt="" className="photo-pnut photo-cat" />
      </div>
      <div className="brand">
        Arely's RD Exam Prep
        <small>{subtitle}</small>
      </div>
      {children}
    </div>
  );
}
