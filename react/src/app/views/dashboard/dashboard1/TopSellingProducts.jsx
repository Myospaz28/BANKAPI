import { Link } from "react-router-dom";
import Card from "react-bootstrap/Card";

const PRODUCTS = [
  {
    prevPrice: 500,
    currentPrice: 450,
    title: "Wireless Headphone E23",
    imgUrl: "/assets/images/products/headphone-4.jpg",
    description: "Lorem ipsum dolor sit amet consectetur."
  },
  {
    prevPrice: 500,
    currentPrice: 200,
    title: "Wireless Headphone Y902",
    imgUrl: "/assets/images/products/headphone-3.jpg",
    description: "Lorem ipsum dolor sit amet consectetur."
  },
  {
    prevPrice: 500,
    currentPrice: 600,
    title: "Wireless Headphone E09",
    imgUrl: "/assets/images/products/headphone-2.jpg",
    description: "Lorem ipsum dolor sit amet consectetur."
  },
  {
    prevPrice: 500,
    currentPrice: 350,
    title: "Wireless Headphone X89",
    imgUrl: "/assets/images/products/headphone-4.jpg",
    description: "Lorem ipsum dolor sit amet consectetur."
  }
];

export default function TopSellingProducts() {
  return (
    <Card className="mb-4">
      <Card.Body className="d-flex flex-column gap-2">
        <Card.Title as="h3" className="mb-3">
          Top selling products
        </Card.Title>

        {PRODUCTS.map((item, index) => (
          <div key={index} className="d-flex gap-3 flex-column flex-sm-row align-items-sm-center">
            <img className="avatar-lg mb-3 mb-sm-0 rounded" src={item.imgUrl} alt="" />

            <div className="flex-grow-1">
              <h5>
                <Link to="/">{item.title}</Link>
              </h5>

              <p className="m-0 text-small text-muted">{item.description}</p>

              <p className="text-small text-danger m-0 gap-1 d-flex">
                ${item.currentPrice}
                <del className="text-muted">${item.prevPrice}</del>
              </p>
            </div>

            <button className="btn btn-outline-primary mt-3 mb-3 m-sm-0 btn-rounded btn-sm">
              View details
            </button>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}
